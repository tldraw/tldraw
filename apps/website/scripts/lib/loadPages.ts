import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import type { Database } from 'sqlite'
import type sqlite3 from 'sqlite3'
import { parseMarkdownHeadings } from '../../utils/parse-markdown'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'pages')

interface PageFrontMatter {
	title: string
	description?: string
	layout?: string
	status?: 'published' | 'draft' | 'unlisted'
	date?: string
	sortIndex?: number
	hero?: string
	metadata?: Record<string, unknown>
}

function getMarkdownFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) return []
	const results: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('_')) continue
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			results.push(...getMarkdownFiles(fullPath))
		} else if (entry.name.endsWith('.md')) {
			results.push(fullPath)
		}
	}

	return results
}

function filePathToUrlPath(filePath: string): string {
	let relative = path.relative(CONTENT_DIR, filePath)
	// Remove .md extension
	relative = relative.replace(/\.md$/, '')
	// index files map to the directory
	relative = relative.replace(/\/index$/, '')
	// homepage.md → /
	if (relative === 'homepage') return '/'
	return '/' + relative
}

function deriveSection(urlPath: string): string {
	if (urlPath === '/') return 'homepage'
	const first = urlPath.split('/')[1]
	return first || 'homepage'
}

function deriveId(urlPath: string): string {
	if (urlPath === '/') return 'homepage'
	// /blog/my-post → blog/my-post
	return urlPath.slice(1)
}

export async function loadPages(db: Database<sqlite3.Database, sqlite3.Statement>) {
	const files = getMarkdownFiles(CONTENT_DIR)

	const pageInsert = await db.prepare(
		`INSERT INTO pages (id, path, title, description, section, layout, status, date, sortIndex, hero, content, metadata)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	)

	const headingInsert = await db.prepare(
		`INSERT INTO headings (pageId, level, title, slug) VALUES (?, ?, ?, ?)`
	)

	const seenPaths = new Set<string>()

	for (const filePath of files) {
		const raw = fs.readFileSync(filePath, 'utf-8')
		const { data: fm, content } = matter(raw) as { data: PageFrontMatter; content: string }

		if (!fm.title) {
			throw new Error(`Missing required 'title' in front matter: ${filePath}`)
		}

		const urlPath = filePathToUrlPath(filePath)

		if (seenPaths.has(urlPath)) {
			throw new Error(`Duplicate page path: ${urlPath} (from ${filePath})`)
		}
		seenPaths.add(urlPath)

		const id = deriveId(urlPath)
		const section = deriveSection(urlPath)
		const metadata = fm.metadata ? JSON.stringify(fm.metadata) : null

		await pageInsert.run(
			id,
			urlPath,
			fm.title,
			fm.description ?? null,
			section,
			fm.layout ?? 'default',
			fm.status ?? 'published',
			fm.date ?? null,
			fm.sortIndex ?? 0,
			fm.hero ?? null,
			content,
			metadata
		)

		// Extract and insert headings
		const headings = parseMarkdownHeadings(content)
		for (const heading of headings) {
			await headingInsert.run(id, heading.level, heading.title, heading.slug)
		}
	}
}
