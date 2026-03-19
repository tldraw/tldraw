import { nicelog } from '@/utils/nicelog'
import { BrokenLink, extractLinks } from './checkBrokenLinks'
import { connect } from './connect'

const CONCURRENCY = 10
const TIMEOUT_MS = 30_000
const MAX_RETRIES = 2

// Domains that block automated requests (403/captcha regardless of method)
const SKIP_DOMAINS = ['www.npmjs.com', 'npmjs.com', 'www.shadertoy.com', 'shadertoy.com']

function shouldSkipUrl(url: string): boolean {
	if (url.includes('{')) return true
	try {
		const host = new URL(url).hostname
		if (host === 'example.com' || host.endsWith('.example.com')) return true
		if (SKIP_DOMAINS.includes(host)) return true
	} catch {
		// skip malformed URLs
	}
	return false
}

function isTransientError(result: { ok: boolean; status?: number; error?: string }): boolean {
	if (result.ok) return false
	// Retry on network errors (timeout, connection reset, etc.)
	if (result.error) return true
	// Retry on server errors and rate limits
	if (result.status && (result.status >= 500 || result.status === 429)) return true
	return false
}

async function checkUrlOnce(
	url: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

	try {
		// Try HEAD first (faster, less bandwidth)
		let res = await fetch(url, {
			method: 'HEAD',
			signal: controller.signal,
			redirect: 'follow',
			headers: { 'User-Agent': 'tldraw-docs-link-checker' },
		})

		// Some servers reject HEAD — fall back to GET
		if (res.status === 405 || res.status === 403) {
			res = await fetch(url, {
				method: 'GET',
				signal: controller.signal,
				redirect: 'follow',
				headers: { 'User-Agent': 'tldraw-docs-link-checker' },
			})
		}

		if (res.ok) return { ok: true }
		return { ok: false, status: res.status }
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err)
		return { ok: false, error: message }
	} finally {
		clearTimeout(timer)
	}
}

async function checkUrl(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
	let result = await checkUrlOnce(url)
	for (let attempt = 0; attempt < MAX_RETRIES && isTransientError(result); attempt++) {
		// Back off briefly before retrying
		await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
		result = await checkUrlOnce(url)
	}
	return result
}

export async function checkExternalLinks(): Promise<number> {
	const db = await connect({ mode: 'readonly' })

	const articles = await db.all<{ path: string | null; content: string }[]>(
		'SELECT path, content FROM articles'
	)

	// Collect all external link occurrences, deduplicating by URL
	const urlOccurrences = new Map<string, Array<{ articlePath: string; line: number }>>()

	for (const article of articles) {
		if (!article.path) continue
		const links = extractLinks(article.content)

		for (const { url, line } of links) {
			if (!url.startsWith('http://') && !url.startsWith('https://')) continue
			if (shouldSkipUrl(url)) continue

			// Strip fragment for checking (servers don't validate fragments)
			const hashIdx = url.indexOf('#')
			const urlWithoutFragment = hashIdx >= 0 ? url.slice(0, hashIdx) : url

			let list = urlOccurrences.get(urlWithoutFragment)
			if (!list) {
				list = []
				urlOccurrences.set(urlWithoutFragment, list)
			}
			list.push({ articlePath: article.path, line })
		}
	}

	await db.close()

	const uniqueUrls = [...urlOccurrences.keys()]
	nicelog(
		`Checking ${uniqueUrls.length} unique external URLs across ${articles.length} articles...`
	)

	// Check URLs with bounded concurrency
	const results = new Map<string, { ok: boolean; status?: number; error?: string }>()
	let checked = 0

	async function worker(urls: string[]) {
		for (const url of urls) {
			results.set(url, await checkUrl(url))
			checked++
			if (checked % 50 === 0) {
				nicelog(`  ...checked ${checked}/${uniqueUrls.length}`)
			}
		}
	}

	// Partition URLs across workers
	const chunks: string[][] = Array.from({ length: CONCURRENCY }, () => [])
	for (let i = 0; i < uniqueUrls.length; i++) {
		chunks[i % CONCURRENCY].push(uniqueUrls[i])
	}
	await Promise.all(chunks.map(worker))

	// Collect broken links
	const broken: BrokenLink[] = []

	for (const [url, result] of results) {
		if (result.ok) continue
		const reason = result.status ? `HTTP ${result.status}` : (result.error ?? 'unknown error')
		const occurrences = urlOccurrences.get(url)!
		for (const { articlePath, line } of occurrences) {
			broken.push({ articlePath, line, url, reason })
		}
	}

	if (broken.length > 0) {
		nicelog(
			`\n✗ Found ${broken.length} broken external link${broken.length === 1 ? '' : 's'}:\n\n` +
				broken
					.map(
						(b, i) =>
							`${i + 1}.\t${b.url}\n\tIn: ${b.articlePath} (line ${b.line})\n\tReason: ${b.reason}`
					)
					.join('\n\n') +
				'\n'
		)
	} else {
		nicelog('\n✔ All external links are valid!')
	}

	return broken.length
}
