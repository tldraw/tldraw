/**
 * Migration script: Framer CMS → Sanity
 *
 * Usage:
 *   1. Export your Framer CMS collections as CSV files
 *   2. Place them in ./data/ (Authors.csv, Blog.csv, Categories.csv, etc.)
 *   3. Set SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID, and NEXT_PUBLIC_SANITY_DATASET
 *   4. Run: npx tsx scripts/migrate-from-framer.ts
 *
 * This script:
 *   - Reads exported Framer CSV data from ./data/
 *   - Maps Framer fields to Sanity document schemas
 *   - Uploads images to Sanity CDN
 *   - Creates documents via Sanity mutation API
 *   - Converts HTML content to Portable Text
 */

import { htmlToBlocks } from '@sanity/block-tools'
import { createClient } from '@sanity/client'
import { Schema } from '@sanity/schema'
import { existsSync, readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import { join } from 'path'

// Configure Sanity client
const client = createClient({
	projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
	dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'staging',
	apiVersion: '2025-01-01',
	token: process.env.SANITY_API_TOKEN!,
	useCdn: false,
})

const DATA_DIR = join(__dirname, 'data')

// Whether to include items marked as draft in Framer
const INCLUDE_DRAFTS = process.env.INCLUDE_DRAFTS === 'true'

// Minimal schema for block-tools HTML conversion
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

function htmlToPortableText(html: string) {
	if (!html) return []
	// @ts-expect-error - block-tools types
	return htmlToBlocks(html, blockContentType, {
		parseHtml: (htmlStr: string) => new JSDOM(htmlStr).window.document,
	})
}

// --- CSV parser (RFC 4180 compliant) ---

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

	// Last field/row
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

function readCsvFile(filename: string): Record<string, string>[] | null {
	const filepath = join(DATA_DIR, filename)
	if (!existsSync(filepath)) {
		console.log(`  Skipping ${filename} (file not found)`)
		return null
	}
	const text = readFileSync(filepath, 'utf-8')
	const rows = parseCsv(text)

	if (!INCLUDE_DRAFTS && rows.length > 0 && ':draft' in rows[0]) {
		const filtered = rows.filter((r) => r[':draft'] !== 'true')
		console.log(
			`  Read ${rows.length} rows from ${filename}, ${filtered.length} after filtering drafts`
		)
		return filtered
	}

	console.log(`  Read ${rows.length} rows from ${filename}`)
	return rows
}

// --- Helpers ---

async function uploadImage(
	url: string
): Promise<{ _type: 'image'; asset: { _type: 'reference'; _ref: string } } | null> {
	if (!url) return null
	try {
		const response = await fetch(url)
		const buffer = Buffer.from(await response.arrayBuffer())
		const asset = await client.assets.upload('image', buffer, {
			filename: url.split('/').pop() || 'image',
		})
		return {
			_type: 'image',
			asset: {
				_type: 'reference',
				_ref: asset._id,
			},
		}
	} catch (err) {
		console.error(`  Failed to upload image: ${url}`, err)
		return null
	}
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
}

/**
 * Assemble blog post body HTML from Framer's multi-block CSV columns.
 * Framer splits long content across: Content, block 1..12, with Embed columns between some blocks.
 */
function assembleBlogBody(row: Record<string, string>): string {
	const parts: string[] = []

	if (row['Content']) parts.push(row['Content'])

	// Block/embed column order from Framer export
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
			// Embed columns contain URLs — wrap as a link paragraph
			parts.push(`<p><a href="${val}">${val}</a></p>`)
		} else {
			parts.push(val)
		}
	}

	return parts.join('\n')
}

/** Strip HTML tags and check if there's any real text content */
function isEmptyHtml(html: string): boolean {
	if (!html) return true
	const stripped = html.replace(/<[^>]*>/g, '').trim()
	return stripped.length === 0
}

// --- Migration functions ---

async function migrateBlogCategories(data: Record<string, string>[]) {
	console.log('\n--- Migrating blog categories ---')
	const transaction = client.transaction()

	for (const item of data) {
		const title = item['Title']
		if (!title) continue

		const doc = {
			_type: 'blogCategory',
			_id: `blogCategory-${item['Slug'] || slugify(title)}`,
			title,
			slug: { _type: 'slug', current: item['Slug'] || slugify(title) },
			description: item['Description'] || '',
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} categories`)
}

async function migrateAuthors(data: Record<string, string>[]) {
	console.log('\n--- Migrating authors ---')
	const transaction = client.transaction()

	for (const item of data) {
		const name = item['Name']
		if (!name) continue

		const avatar = await uploadImage(item['Pic'])
		const doc = {
			_type: 'author',
			_id: `author-${item['Slug'] || slugify(name)}`,
			name,
			slug: { _type: 'slug', current: item['Slug'] || slugify(name) },
			role: item['Role'] || '',
			...(avatar && { avatar }),
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.name}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} authors`)
}

async function migrateBlogPosts(data: Record<string, string>[]) {
	console.log('\n--- Migrating blog posts ---')

	for (const item of data) {
		const title = item['Title']
		if (!title) continue

		const bodyHtml = assembleBlogBody(item)
		const body = htmlToPortableText(bodyHtml)
		const coverImage = await uploadImage(item['Hero Image'] || item['Thumbnail Image'])

		const slug = item['Slug'] || slugify(title)
		const authors = item['Authors']?.split(',')[0]?.trim() // Take first author if comma-separated
		const category = item['Categories']?.split(',')[0]?.trim() // Take first category if comma-separated

		const doc = {
			_type: 'blogPost',
			_id: `blogPost-${slug}`,
			title,
			slug: { _type: 'slug', current: slug },
			excerpt: item['Excerpt'] || '',
			body,
			publishedAt: item['Date'] || new Date().toISOString(),
			...(coverImage && { coverImage }),
			...(authors && {
				author: {
					_type: 'reference',
					_ref: `author-${authors}`,
				},
			}),
			...(category && {
				category: {
					_type: 'reference',
					_ref: `blogCategory-${category}`,
				},
			}),
		}

		await client.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	console.log(`  Committed ${data.length} blog posts`)
}

async function migrateTestimonials(data: Record<string, string>[]) {
	console.log('\n--- Migrating testimonials ---')
	const transaction = client.transaction()

	for (const item of data) {
		const name = item['Name']
		if (!name) continue

		// Content is HTML like <p>quote text</p> — extract plain text for quote field
		const quoteHtml = item['Content'] || ''
		const quote = quoteHtml.replace(/<[^>]*>/g, '').trim()
		if (!quote) continue

		const avatar = await uploadImage(item['Profile Picture'])
		const doc = {
			_type: 'testimonial',
			_id: `testimonial-${item['Slug'] || slugify(name)}`,
			quote,
			author: name,
			role: item['Handle'] || '',
			company: '',
			...(avatar && { avatar }),
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.author}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} testimonials`)
}

async function migrateLegalPages(data: Record<string, string>[]) {
	console.log('\n--- Migrating legal pages ---')

	for (const item of data) {
		const title = item['Title']
		if (!title) continue

		const body = htmlToPortableText(item['Content'] || '')
		const slug = item['Slug'] || slugify(title)

		const doc = {
			_type: 'legalPage',
			_id: `legalPage-${slug}`,
			title,
			slug: { _type: 'slug', current: slug },
			body,
			lastUpdated: new Date().toISOString(),
		}
		await client.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}
}

async function migrateShowcase(data: Record<string, string>[]) {
	console.log('\n--- Migrating showcase (case studies) ---')
	const transaction = client.transaction()

	for (const item of data) {
		const name = item['Name']
		if (!name) continue

		const logo = await uploadImage(item['Visual'])
		const excerpt = item['Content']
			? item['Content'].replace(/<[^>]*>/g, '').trim()
			: item['Description'] || ''

		const slug = item['Slug'] || slugify(name)

		const doc = {
			_type: 'caseStudy',
			_id: `caseStudy-${slug}`,
			title: name,
			slug: { _type: 'slug', current: slug },
			company: name,
			excerpt,
			...(logo && { logo }),
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} case studies`)
}

async function migrateFeatures(data: Record<string, string>[]) {
	console.log('\n--- Migrating feature pages ---')

	for (const item of data) {
		const title = item['Title']
		if (!title) continue

		// Combine key_features and deep_dive markdown as HTML for body
		const bodyParts: string[] = []
		if (item['Content'] && !isEmptyHtml(item['Content'])) {
			bodyParts.push(item['Content'])
		}
		if (item['key_features']) {
			// key_features is markdown-ish — wrap in basic HTML
			bodyParts.push(
				item['key_features']
					.split('\n-\n')
					.map((section) => {
						const lines = section.trim().split('\n')
						const heading = lines[0]?.replace(/^#+\s*/, '')
						const rest = lines.slice(1).join(' ').trim()
						return `<h3>${heading}</h3><p>${rest}</p>`
					})
					.join('\n')
			)
		}
		if (item['deep_dive']) {
			bodyParts.push(
				item['deep_dive']
					.split('\n')
					.map((line) => {
						const headingMatch = line.match(/^(#+)\s*(.*)/)
						if (headingMatch) {
							const level = headingMatch[1].length
							return `<h${level}>${headingMatch[2]}</h${level}>`
						}
						return line ? `<p>${line}</p>` : ''
					})
					.join('\n')
			)
		}

		const body = htmlToPortableText(bodyParts.join('\n'))
		const slug = item['Slug'] || slugify(title)

		const doc = {
			_type: 'featurePage',
			_id: `featurePage-${slug}`,
			title,
			slug: { _type: 'slug', current: slug },
			description: item['Subtitle'] || '',
			body,
		}

		await client.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	console.log(`  Committed ${data.length} feature pages`)
}

// --- Main ---

async function main() {
	console.log('=== Framer → Sanity Migration ===')
	console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'staging'}`)
	console.log(`Data dir: ${DATA_DIR}`)
	console.log(`Include drafts: ${INCLUDE_DRAFTS}`)

	if (!existsSync(DATA_DIR)) {
		console.error(`\nError: Data directory not found at ${DATA_DIR}`)
		console.error('Please create it and add your exported Framer CSV files.')
		process.exit(1)
	}

	// Migrate in dependency order (categories & authors before posts)
	const categories = readCsvFile('Categories.csv')
	if (categories?.length) await migrateBlogCategories(categories)

	const authors = readCsvFile('Authors.csv')
	if (authors?.length) await migrateAuthors(authors)

	const posts = readCsvFile('Blog.csv')
	if (posts?.length) await migrateBlogPosts(posts)

	const testimonials = readCsvFile('New-Tweets.csv')
	if (testimonials?.length) await migrateTestimonials(testimonials)

	const legal = readCsvFile('Legal.csv')
	if (legal?.length) await migrateLegalPages(legal)

	const showcase = readCsvFile('Showcase.csv')
	if (showcase?.length) await migrateShowcase(showcase)

	const features = readCsvFile('Features.csv')
	if (features?.length) await migrateFeatures(features)

	console.log('\n=== Migration complete ===')
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
