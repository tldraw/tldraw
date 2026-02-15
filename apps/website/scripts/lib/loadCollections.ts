import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import type { Database } from 'sqlite'
import type sqlite3 from 'sqlite3'

const COLLECTIONS_DIR = path.join(process.cwd(), 'content', 'collections')

interface CollectionConfig {
	name: string
	itemTitleField?: string
	requiredFields?: string[]
	inline?: boolean
	items?: Array<Record<string, unknown> & { id: string }>
}

export async function loadCollections(db: Database<sqlite3.Database, sqlite3.Statement>) {
	if (!fs.existsSync(COLLECTIONS_DIR)) return

	const itemInsert = await db.prepare(
		`INSERT INTO collection_items (id, collection, sortIndex, title, tags, content, data)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	)

	const dirs = fs
		.readdirSync(COLLECTIONS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())

	for (const dir of dirs) {
		const collectionDir = path.join(COLLECTIONS_DIR, dir.name)
		const configPath = path.join(collectionDir, '_collection.json')

		if (!fs.existsSync(configPath)) {
			throw new Error(`Missing _collection.json in ${collectionDir}`)
		}

		const config: CollectionConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
		const collectionName = config.name || dir.name

		if (config.inline && config.items) {
			// Inline collection: items defined directly in JSON
			for (let i = 0; i < config.items.length; i++) {
				const item = config.items[i]
				const id = `${collectionName}/${item.id}`
				const title = config.itemTitleField ? String(item[config.itemTitleField] ?? '') : null
				const tags = Array.isArray(item.tags) ? JSON.stringify(item.tags) : null
				const { id: _id, tags: _tags, ...rest } = item

				await itemInsert.run(
					id,
					collectionName,
					i,
					title,
					tags,
					null, // no markdown body for inline items
					JSON.stringify(rest)
				)
			}
			continue
		}

		// File-based collection: each .md file is an item
		const files = fs
			.readdirSync(collectionDir)
			.filter((f) => f.endsWith('.md'))
			.sort()

		for (let i = 0; i < files.length; i++) {
			const filePath = path.join(collectionDir, files[i])
			const raw = fs.readFileSync(filePath, 'utf-8')
			const { data: fm, content } = matter(raw)

			const slug = files[i].replace(/\.md$/, '')
			const id = `${collectionName}/${slug}`
			const title = config.itemTitleField
				? String(fm[config.itemTitleField] ?? '')
				: ((fm.title as string) ?? null)
			const sortIndex = typeof fm.order === 'number' ? fm.order : i
			const tags = Array.isArray(fm.tags) ? JSON.stringify(fm.tags) : null

			// Validate required fields
			if (config.requiredFields) {
				for (const field of config.requiredFields) {
					if (fm[field] === undefined || fm[field] === null) {
						throw new Error(
							`Missing required field '${field}' in ${filePath} (collection: ${collectionName})`
						)
					}
				}
			}

			// Remove internal fields from the data blob
			const { tags: _tags, order: _order, ...rest } = fm

			await itemInsert.run(
				id,
				collectionName,
				sortIndex,
				title,
				tags,
				content.trim() || null,
				JSON.stringify(rest)
			)
		}
	}
}
