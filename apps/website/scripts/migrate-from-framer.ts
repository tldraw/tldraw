/**
 * Migration script: Framer CMS → Sanity
 *
 * Usage:
 *   1. Export your Framer CMS data as JSON/CSV
 *   2. Place the exported files in ./data/
 *   3. Set SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID, and NEXT_PUBLIC_SANITY_DATASET
 *   4. Run: npx tsx scripts/migrate-from-framer.ts
 *
 * This script:
 *   - Reads exported Framer data from ./data/
 *   - Maps Framer fields to Sanity document schemas
 *   - Uploads images to Sanity CDN
 *   - Creates documents via Sanity mutation API
 *   - Converts HTML content to Portable Text
 */

import { htmlToBlocks } from '@sanity/block-tools'
import { createClient } from '@sanity/client'
import { Schema } from '@sanity/schema'
import { existsSync, readFileSync } from 'fs'
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
	return htmlToBlocks(html, blockContentType)
}

function readJsonFile(filename: string) {
	const filepath = join(DATA_DIR, filename)
	if (!existsSync(filepath)) {
		console.log(`  Skipping ${filename} (file not found)`)
		return null
	}
	return JSON.parse(readFileSync(filepath, 'utf-8'))
}

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

async function migrateBlogCategories(data: any[]) {
	console.log('\n--- Migrating blog categories ---')
	const transaction = client.transaction()

	for (const item of data) {
		const doc = {
			_type: 'blogCategory',
			_id: `blogCategory-${slugify(item.title || item.name)}`,
			title: item.title || item.name,
			slug: { _type: 'slug', current: slugify(item.title || item.name) },
			description: item.description || '',
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} categories`)
}

async function migrateAuthors(data: any[]) {
	console.log('\n--- Migrating authors ---')
	const transaction = client.transaction()

	for (const item of data) {
		const avatar = await uploadImage(item.avatar || item.image)
		const doc = {
			_type: 'author',
			_id: `author-${slugify(item.name)}`,
			name: item.name,
			slug: { _type: 'slug', current: slugify(item.name) },
			bio: item.bio || '',
			role: item.role || item.title || '',
			...(avatar && { avatar }),
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.name}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} authors`)
}

async function migrateBlogPosts(data: any[]) {
	console.log('\n--- Migrating blog posts ---')

	for (const item of data) {
		const coverImage = await uploadImage(item.coverImage || item.image || item.thumbnail)
		const body = htmlToPortableText(item.body || item.content || '')

		const doc = {
			_type: 'blogPost',
			_id: `blogPost-${slugify(item.slug || item.title)}`,
			title: item.title,
			slug: { _type: 'slug', current: item.slug || slugify(item.title) },
			excerpt: item.excerpt || item.description || '',
			body,
			publishedAt: item.publishedAt || item.date || new Date().toISOString(),
			...(coverImage && { coverImage }),
			...(item.author && {
				author: {
					_type: 'reference',
					_ref: `author-${slugify(item.author)}`,
				},
			}),
			...(item.category && {
				category: {
					_type: 'reference',
					_ref: `blogCategory-${slugify(item.category)}`,
				},
			}),
		}

		await client.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	console.log(`  Committed ${data.length} blog posts`)
}

async function migrateTeamMembers(data: any[]) {
	console.log('\n--- Migrating team members ---')
	const transaction = client.transaction()

	for (let i = 0; i < data.length; i++) {
		const item = data[i]
		const avatar = await uploadImage(item.avatar || item.image)
		const doc = {
			_type: 'teamMember',
			_id: `teamMember-${slugify(item.name)}`,
			name: item.name,
			role: item.role || item.title || '',
			bio: item.bio || '',
			order: i,
			...(avatar && { avatar }),
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.name}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} team members`)
}

async function migrateJobListings(data: any[]) {
	console.log('\n--- Migrating job listings ---')
	const transaction = client.transaction()

	for (const item of data) {
		const description = htmlToPortableText(item.description || item.body || '')
		const doc = {
			_type: 'jobListing',
			_id: `jobListing-${slugify(item.title)}`,
			title: item.title,
			department: item.department || 'Engineering',
			location: item.location || 'Remote',
			type: item.type || 'full-time',
			description,
			applyUrl: item.applyUrl || item.url || '#',
			isActive: item.isActive !== false,
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} job listings`)
}

async function migrateTestimonials(data: any[]) {
	console.log('\n--- Migrating testimonials ---')
	const transaction = client.transaction()

	for (const item of data) {
		const avatar = await uploadImage(item.avatar || item.image)
		const doc = {
			_type: 'testimonial',
			_id: `testimonial-${slugify(item.author || item.name)}`,
			quote: item.quote || item.text,
			author: item.author || item.name,
			role: item.role || item.title || '',
			company: item.company || '',
			...(avatar && { avatar }),
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.author}`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} testimonials`)
}

async function migrateFaqItems(data: any[]) {
	console.log('\n--- Migrating FAQ items ---')
	const transaction = client.transaction()

	for (let i = 0; i < data.length; i++) {
		const item = data[i]
		const answer = htmlToPortableText(item.answer || item.body || '')
		const doc = {
			_type: 'faqItem',
			_id: `faqItem-${slugify(item.question).slice(0, 50)}`,
			question: item.question,
			answer,
			category: item.category || '',
			order: i,
		}
		transaction.createOrReplace(doc)
		console.log(`  + ${doc.question.slice(0, 60)}...`)
	}

	await transaction.commit()
	console.log(`  Committed ${data.length} FAQ items`)
}

async function migrateLegalPages(data: any[]) {
	console.log('\n--- Migrating legal pages ---')

	for (const item of data) {
		const body = htmlToPortableText(item.body || item.content || '')
		const doc = {
			_type: 'legalPage',
			_id: `legalPage-${slugify(item.slug || item.title)}`,
			title: item.title,
			slug: { _type: 'slug', current: item.slug || slugify(item.title) },
			body,
			lastUpdated: item.lastUpdated || new Date().toISOString(),
		}
		await client.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}
}

async function main() {
	console.log('=== Framer → Sanity Migration ===')
	console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'staging'}`)
	console.log(`Data dir: ${DATA_DIR}`)

	if (!existsSync(DATA_DIR)) {
		console.error(`\nError: Data directory not found at ${DATA_DIR}`)
		console.error('Please create it and add your exported Framer data files.')
		process.exit(1)
	}

	// Migrate in dependency order
	const categories = readJsonFile('blog-categories.json')
	if (categories) await migrateBlogCategories(categories)

	const authors = readJsonFile('authors.json')
	if (authors) await migrateAuthors(authors)

	const posts = readJsonFile('blog-posts.json')
	if (posts) await migrateBlogPosts(posts)

	const team = readJsonFile('team-members.json')
	if (team) await migrateTeamMembers(team)

	const jobs = readJsonFile('job-listings.json')
	if (jobs) await migrateJobListings(jobs)

	const testimonials = readJsonFile('testimonials.json')
	if (testimonials) await migrateTestimonials(testimonials)

	const faq = readJsonFile('faq-items.json')
	if (faq) await migrateFaqItems(faq)

	const legal = readJsonFile('legal-pages.json')
	if (legal) await migrateLegalPages(legal)

	console.log('\n=== Migration complete ===')
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
