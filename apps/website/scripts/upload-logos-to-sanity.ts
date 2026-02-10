/**
 * Upload logo images from public/images/logos/ to Sanity and patch showcaseEntry documents.
 *
 * Run from apps/website:  yarn upload-logos
 * Requires .env.local with NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Load .env.local
try {
	const envPath = join(process.cwd(), '.env.local')
	const env = readFileSync(envPath, 'utf8')
	for (const line of env.split('\n')) {
		const m = line.match(/^([^#=]+)=(.*)$/)
		if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
	}
} catch {
	// .env.local may not exist
}

import { createClient } from '@sanity/client'

const logosDir = join(process.cwd(), 'public', 'images', 'logos')

const client = createClient({
	projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
	dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
	apiVersion: '2025-01-01',
	token: process.env.SANITY_API_TOKEN!,
	useCdn: false,
})

/** Map logo filename (without extension) to showcase entry slug.current */
const logoToSlug: Record<string, string> = {
	alai: 'alai',
	aries: 'aries',
	autodesk: 'autodesk',
	bigpi: 'bigpi',
	cadchat: 'cadchat',
	clickup: 'clickup',
	craft: 'craft',
	dirac: 'dirac',
	genio: 'genio',
	google: 'google',
	growtherapy: 'grow-therapy',
	jam: 'jam',
	legendkeeper: 'de', // LegendKeeper has slug "de" in Showcase
	'matilda-workspace': 'matilda',
	mobbin: 'mobbin',
	padlet: 'padlet',
	pollination: 'pollination',
}

async function uploadLogos() {
	const entries = await client.fetch<{ _id: string; slug: { current: string }; name: string }[]>(
		`*[_type == "showcaseEntry"]{ _id, slug, name }`
	)

	const slugToEntry = new Map(entries.map((e) => [e.slug.current, e]))

	for (const [logoName, slug] of Object.entries(logoToSlug)) {
		const filePath = join(logosDir, `${logoName}.svg`)
		let buffer: Buffer
		try {
			buffer = readFileSync(filePath)
		} catch {
			console.log(`  Skipping ${logoName}.svg (file not found)`)
			continue
		}

		const entry = slugToEntry.get(slug)
		if (!entry) {
			console.log(`  Skipping ${logoName}.svg (no showcase entry for slug "${slug}")`)
			continue
		}

		try {
			const asset = await client.assets.upload('image', buffer, {
				filename: `${logoName}.svg`,
				contentType: 'image/svg+xml',
			})

			await client
				.patch(entry._id)
				.set({
					logo: {
						_type: 'image',
						asset: { _type: 'reference', _ref: asset._id },
					},
				})
				.commit()

			console.log(`  ✓ ${entry.name} (${slug})`)
		} catch (err) {
			console.error(`  ✗ ${entry.name}:`, err)
		}
	}
}

uploadLogos().then(
	() => console.log('Done.'),
	(err) => {
		console.error('Error:', err)
		process.exit(1)
	}
)
