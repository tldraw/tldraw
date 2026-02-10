/**
 * Migration script: Fix code blocks in Sanity blog posts
 *
 * The original Framer→Sanity migration flattened <pre><code> blocks into
 * regular text paragraphs because the schema passed to htmlToBlocks only
 * included { type: 'block' }. This script re-parses the original CSV HTML,
 * extracts code blocks properly, and patches the Sanity documents.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/migrate-code-blocks.ts   # preview changes
 *   npx tsx scripts/migrate-code-blocks.ts                 # apply changes
 */

import { htmlToBlocks } from '@sanity/block-tools'
import { createClient } from '@sanity/client'
import { Schema } from '@sanity/schema'
import { existsSync, readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import { join } from 'path'

const DRY_RUN = process.env.DRY_RUN === 'true'

function getSanityClient() {
	const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
	const token = process.env.SANITY_API_TOKEN
	if (!projectId || !token) {
		if (!DRY_RUN) {
			console.error('NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_TOKEN are required for live mode.')
			process.exit(1)
		}
		return null
	}
	return createClient({
		projectId,
		dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
		apiVersion: '2025-01-01',
		token,
		useCdn: false,
	})
}

const DATA_DIR = join(__dirname, 'data')

// Schema for htmlToBlocks (block only — we handle code separately)
const defaultSchema = Schema.compile({
	name: 'default',
	types: [
		{
			type: 'object',
			name: 'blogPost',
			fields: [
				{
					title: 'Body',
					name: 'body',
					type: 'array',
					of: [{ type: 'block' }],
				},
			],
		},
	],
})

const blockContentType = defaultSchema
	.get('blogPost')
	.fields.find((f: { name: string }) => f.name === 'body').type

// --- CSV parser (same as migrate-from-framer.ts) ---

function parseCsv(text: string): Record<string, string>[] {
	const rows: string[][] = []
	let row: string[] = []
	let field = ''
	let inQuotes = false
	let i = 0

	while (i < text.length) {
		const ch = text[i]
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < text.length && text[i + 1] === '"') {
					field += '"'
					i += 2
				} else {
					inQuotes = false
					i++
				}
			} else {
				field += ch
				i++
			}
		} else {
			if (ch === '"') {
				inQuotes = true
				i++
			} else if (ch === ',') {
				row.push(field)
				field = ''
				i++
			} else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
				row.push(field)
				field = ''
				rows.push(row)
				row = []
				i += ch === '\r' ? 2 : 1
			} else {
				field += ch
				i++
			}
		}
	}

	if (field || row.length > 0) {
		row.push(field)
		rows.push(row)
	}

	if (rows.length < 2) return []

	const headers = rows[0]
	return rows.slice(1).map((r) => {
		const obj: Record<string, string> = {}
		for (let j = 0; j < headers.length; j++) {
			obj[headers[j]] = r[j] ?? ''
		}
		return obj
	})
}

// --- HTML assembly (same as migrate-from-framer.ts) ---

function assembleBlogBody(row: Record<string, string>): string {
	const parts: string[] = []
	if (row['Content']) parts.push(row['Content'])

	const blockOrder = [
		'block 1',
		'Embed b1-2',
		'block 2',
		'Embed b2-3',
		'block 3',
		'block 4',
		'block 5',
		'block 6',
		'block 7',
		'Embed b7-8',
		'block 8',
		'block 9',
		'block 10',
		'block 11',
		'block 12',
	]

	for (const col of blockOrder) {
		const val = row[col]?.trim()
		if (!val) continue
		if (col.startsWith('Embed')) {
			parts.push(`<p><a href="${val}">${val}</a></p>`)
		} else {
			parts.push(val)
		}
	}

	return parts.join('\n')
}

// --- Code block extraction ---

interface CodeBlock {
	code: string
	language: string
}

/**
 * Parse HTML, split at <pre> boundaries, and return an ordered array of
 * portable text blocks with proper code objects interspersed.
 */
function htmlToPortableTextWithCode(html: string): unknown[] {
	if (!html) return []

	const dom = new JSDOM(`<div id="root">${html}</div>`)
	const root = dom.window.document.getElementById('root')!

	// Walk through top-level children, grouping non-pre elements and
	// converting <pre> elements to code blocks
	const result: unknown[] = []
	let htmlBuffer: string[] = []

	function flushHtmlBuffer() {
		if (htmlBuffer.length === 0) return
		const combined = htmlBuffer.join('')
		if (combined.trim()) {
			// @ts-expect-error - block-tools types
			const blocks = htmlToBlocks(combined, blockContentType, {
				parseHtml: (h: string) => new JSDOM(h).window.document,
			})
			result.push(...blocks)
		}
		htmlBuffer = []
	}

	for (const child of Array.from(root.childNodes)) {
		const el = child as Element

		if (el.tagName?.toLowerCase() === 'pre') {
			// Flush any accumulated HTML first
			flushHtmlBuffer()

			// Extract code content and language
			const codeEl = el.querySelector('code')
			const code = (codeEl?.textContent || el.textContent || '').trim()
			const lang = el.getAttribute('data-language')?.replace(/"/g, '') || ''

			if (code) {
				result.push({
					_type: 'code',
					_key: generateKey(),
					code,
					language: normalizeLanguage(lang),
				})
			}
		} else {
			// Serialize this node back to HTML and buffer it
			if (el.outerHTML) {
				htmlBuffer.push(el.outerHTML)
			} else if (el.textContent?.trim()) {
				htmlBuffer.push(el.textContent)
			}
		}
	}

	flushHtmlBuffer()
	return result
}

function normalizeLanguage(lang: string): string {
	const map: Record<string, string> = {
		jsx: 'tsx',
		JSX: 'tsx',
		javascript: 'javascript',
		js: 'javascript',
		typescript: 'typescript',
		ts: 'typescript',
		tsx: 'tsx',
		html: 'html',
		css: 'css',
		json: 'json',
		bash: 'bash',
		shell: 'bash',
		sh: 'bash',
		python: 'python',
		py: 'python',
	}
	return map[lang] || lang.toLowerCase() || 'typescript'
}

function generateKey(): string {
	return Math.random().toString(36).slice(2, 12)
}

// --- Main ---

async function main() {
	console.log('=== Code Block Migration ===')
	console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will patch Sanity)'}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'}`)

	const client = getSanityClient()

	const csvPath = join(DATA_DIR, 'Blog.csv')
	if (!existsSync(csvPath)) {
		console.error('Blog.csv not found in data directory')
		process.exit(1)
	}

	const text = readFileSync(csvPath, 'utf-8')
	const rows = parseCsv(text)
	console.log(`Found ${rows.length} blog posts in CSV\n`)

	let postsWithCode = 0
	let totalCodeBlocks = 0

	for (const row of rows) {
		const title = row['Title']
		const slug = row['Slug']
		if (!title || !slug) continue
		if (row[':draft'] === 'true') continue

		const html = assembleBlogBody(row)

		// Check if this post has any <pre> tags
		if (!html.includes('<pre')) continue

		const body = htmlToPortableTextWithCode(html)
		const codeBlocks = body.filter(
			(b: unknown) => (b as { _type: string })._type === 'code'
		) as CodeBlock[]

		if (codeBlocks.length === 0) continue

		postsWithCode++
		totalCodeBlocks += codeBlocks.length

		console.log(`📝 ${title} (${slug})`)
		for (const cb of codeBlocks) {
			const preview = cb.code.split('\n')[0].slice(0, 80)
			console.log(`   └─ [${(cb as unknown as { language: string }).language}] ${preview}...`)
		}

		if (!DRY_RUN) {
			const docId = `blogPost-${slug}`
			try {
				await client.patch(docId).set({ body }).commit()
				console.log(`   ✅ Patched`)
			} catch (err) {
				console.error(`   ❌ Failed to patch: ${(err as Error).message}`)
			}
		}
	}

	console.log(`\n=== Summary ===`)
	console.log(`Posts with code blocks: ${postsWithCode}`)
	console.log(`Total code blocks: ${totalCodeBlocks}`)
	if (DRY_RUN) {
		console.log(`\nRun without DRY_RUN=true to apply changes.`)
	}
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
