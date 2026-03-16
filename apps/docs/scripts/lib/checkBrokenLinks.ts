import { fetchFramerPaths } from '@/utils/framer-sitemap'
import { nicelog } from '@/utils/nicelog'
import { connect } from './connect'

export interface BrokenLink {
	articlePath: string
	line: number
	url: string
	reason: string
}

// Internal rewrites: source → destination (both are valid paths)
const INTERNAL_REWRITES: Record<string, string> = {
	'/releases': '/getting-started/releases',
	'/quick-start': '/getting-started/quick-start',
	'/installation': '/getting-started/installation',
}

/**
 * Strip fenced code blocks from markdown, replacing them with blank lines
 * to preserve line numbering for error reporting.
 */
export function stripCodeBlocks(content: string): string {
	return content.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, (match) => {
		// Replace with same number of newlines to preserve line count
		return '\n'.repeat((match.match(/\n/g) || []).length)
	})
}

// File extensions that indicate static assets (not page routes)
const STATIC_ASSET_EXTENSIONS =
	/\.(png|jpe?g|gif|svg|webp|ico|pdf|mp4|webm|mp3|woff2?|ttf|eot|css|js|json|xml|txt|zip|tar|gz)$/i

/**
 * Extract all links from markdown/MDX content.
 * Returns array of { url, line } for every link found (internal and external).
 */
export function extractLinks(content: string): Array<{ url: string; line: number }> {
	const stripped = stripCodeBlocks(content)
	const lines = stripped.split('\n')
	const links: Array<{ url: string; line: number }> = []

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		const lineNum = i + 1

		// Standard markdown links: [text](url)
		const mdLinkRegex = /\[[^\]]*\]\(([^)]*)\)/g
		let match
		while ((match = mdLinkRegex.exec(line)) !== null) {
			const url = match[1].trim()
			if (url) links.push({ url, line: lineNum })
		}

		// JSX href attributes: href="url"
		const hrefRegex = /href="([^"]*)"/g
		while ((match = hrefRegex.exec(line)) !== null) {
			const url = match[1].trim()
			if (url) links.push({ url, line: lineNum })
		}

		// CodeLinks JSON values: <CodeLinks links={{"Name":"/path"}}>
		const codeLinksRegex = /<CodeLinks\s+links=\{\{([^}]+)\}\}/g
		while ((match = codeLinksRegex.exec(line)) !== null) {
			try {
				const json = JSON.parse(`{${match[1]}}`)
				for (const value of Object.values(json)) {
					if (typeof value === 'string' && value) {
						links.push({ url: value, line: lineNum })
					}
				}
			} catch {
				// Skip malformed JSON
			}
		}
	}

	return links
}

/**
 * Extract internal links from markdown/MDX content.
 * Returns array of { url, line } for each internal link found.
 */
function extractInternalLinks(content: string): Array<{ url: string; line: number }> {
	return extractLinks(content).filter(({ url }) => url.startsWith('/'))
}

/**
 * Try to resolve a path via redirect patterns from next.config.js.
 * Returns the resolved destination path, or null if no redirect matches.
 */
function tryRedirect(urlPath: string): string | null {
	// /examples/:cat/:id → /examples/:id
	const exTwoParts = urlPath.match(/^\/examples\/[^/]+\/([^/]+)$/)
	if (exTwoParts) return `/examples/${exTwoParts[1]}`

	// /examples/:cat1/:cat2/:id → /examples/:id
	const exThreeParts = urlPath.match(/^\/examples\/[^/]+\/[^/]+\/([^/]+)$/)
	if (exThreeParts) return `/examples/${exThreeParts[1]}`

	// /getting-started/:child → /:child
	const gsMatch = urlPath.match(/^\/getting-started\/(.+)$/)
	if (gsMatch) return `/${gsMatch[1]}`

	return null
}

export async function checkBrokenLinks(): Promise<number> {
	const db = await connect({ mode: 'readonly' })

	// Fetch framer paths from the live sitemap so we don't maintain a stale list
	const framerPaths = await fetchFramerPaths()

	// Build set of all valid paths
	const validPaths = new Set<string>()

	const articles = await db.all<{ path: string | null; content: string }[]>(
		'SELECT path, content FROM articles'
	)
	const sections = await db.all<{ path: string }[]>('SELECT path FROM sections')
	const categories = await db.all<{ path: string | null }[]>('SELECT path FROM categories')

	for (const row of articles) {
		if (row.path) validPaths.add(row.path)
	}
	for (const row of sections) {
		if (row.path) validPaths.add(row.path)
	}
	for (const row of categories) {
		if (row.path) validPaths.add(row.path)
	}

	// Add internal rewrite sources (these are valid URLs that rewrite to DB paths)
	for (const source of Object.keys(INTERNAL_REWRITES)) {
		validPaths.add(source)
	}

	// Case-insensitive path set for fallback matching (handles macOS FS collisions)
	const validPathsLower = new Set([...validPaths].map((p) => p.toLowerCase()))

	// Build heading lookup: articlePath → Set<slug>
	const headingMap = new Map<string, Set<string>>()
	const headings = await db.all<{ slug: string; articleId: string }[]>(
		'SELECT slug, articleId FROM headings'
	)

	// We need article paths keyed by article ID
	const articlePathById = new Map<string, string>()
	const allArticles = await db.all<{ id: string; path: string | null }[]>(
		'SELECT id, path FROM articles'
	)
	for (const a of allArticles) {
		if (a.path) articlePathById.set(a.id, a.path)
	}

	for (const h of headings) {
		const articlePath = articlePathById.get(h.articleId)
		if (!articlePath) continue
		const loweredSlug = h.slug.toLowerCase()
		let slugs = headingMap.get(articlePath)
		if (!slugs) {
			slugs = new Set()
			headingMap.set(articlePath, slugs)
		}
		slugs.add(loweredSlug)
		// Also index by lowercase path for case-insensitive lookups
		const lowerPath = articlePath.toLowerCase()
		let lowerSlugs = headingMap.get(lowerPath)
		if (!lowerSlugs) {
			lowerSlugs = new Set()
			headingMap.set(lowerPath, lowerSlugs)
		}
		lowerSlugs.add(loweredSlug)
	}

	// Also build heading map for rewrite destinations
	for (const [source, dest] of Object.entries(INTERNAL_REWRITES)) {
		const slugs = headingMap.get(dest)
		if (slugs) {
			headingMap.set(source, slugs)
		}
	}

	// Check all articles for broken links
	const broken: BrokenLink[] = []

	for (const article of articles) {
		if (!article.path) continue
		const links = extractInternalLinks(article.content)

		for (const { url, line } of links) {
			// Skip static asset paths (images, fonts, etc.)
			if (STATIC_ASSET_EXTENSIONS.test(url)) continue

			// Split path and fragment
			const hashIdx = url.indexOf('#')
			const urlPath = hashIdx >= 0 ? url.slice(0, hashIdx) : url
			const fragment = hashIdx >= 0 ? url.slice(hashIdx + 1).toLowerCase() : null

			// Empty path with fragment = same-page anchor
			if (urlPath === '' && fragment) {
				const slugs = headingMap.get(article.path)
				if (!slugs || !slugs.has(fragment)) {
					broken.push({
						articlePath: article.path,
						line,
						url,
						reason: `anchor #${fragment} not found in ${article.path}`,
					})
				}
				continue
			}

			// Check if path is valid
			let pathValid = false
			let resolvedPath = urlPath

			if (validPaths.has(urlPath)) {
				pathValid = true
			} else if (validPathsLower.has(urlPath.toLowerCase())) {
				// Case-insensitive fallback (handles macOS FS collisions
				// where e.g. Atom.mdx and atom.mdx map to the same file)
				pathValid = true
			} else if (framerPaths.has(urlPath)) {
				pathValid = true
			} else {
				// Try redirect resolution
				const redirected = tryRedirect(urlPath)
				if (
					redirected &&
					(validPaths.has(redirected) || validPathsLower.has(redirected.toLowerCase()))
				) {
					pathValid = true
					resolvedPath = redirected
				}
			}

			if (!pathValid) {
				broken.push({
					articlePath: article.path,
					line,
					url,
					reason: 'page not found',
				})
				continue
			}

			// Check fragment if present
			if (fragment) {
				// Resolve internal rewrites for heading lookup
				const lookupPath = INTERNAL_REWRITES[resolvedPath] || resolvedPath
				const slugs = headingMap.get(lookupPath) || headingMap.get(lookupPath.toLowerCase())
				if (!slugs || !slugs.has(fragment)) {
					broken.push({
						articlePath: article.path,
						line,
						url,
						reason: `anchor #${fragment} not found in ${resolvedPath}`,
					})
				}
			}
		}
	}

	if (broken.length > 0) {
		nicelog(
			`\n✗ Found ${broken.length} broken link${broken.length === 1 ? '' : 's'}:\n\n` +
				broken
					.map(
						(b, i) =>
							`${i + 1}.\t${b.url}\n\tIn: ${b.articlePath} (line ${b.line})\n\tReason: ${b.reason}`
					)
					.join('\n\n') +
				'\n'
		)
	}

	await db.close()
	return broken.length
}
