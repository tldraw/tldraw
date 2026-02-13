import path from 'path'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import type { CollectionItemRecord, HeadingRecord, PageRecord } from '../types/content-types'

export class ContentDatabase {
	private dbPromise: ReturnType<typeof open> | null = null

	async getDb() {
		if (!this.dbPromise || process.env.NODE_ENV === 'development') {
			this.dbPromise = open({
				filename: path.join(process.cwd(), 'content.db'),
				driver: sqlite3.Database,
				mode: sqlite3.OPEN_READONLY,
			})
		}
		return this.dbPromise
	}

	/** Get a single published page by its URL path. */
	async getPage(path: string): Promise<PageRecord | undefined> {
		const db = await this.getDb()
		return db.get<PageRecord>(`SELECT * FROM pages WHERE path = ? AND status = 'published'`, path)
	}

	/** Get all published pages in a section, ordered by sortIndex then date. */
	async getPagesBySection(section: string): Promise<PageRecord[]> {
		const db = await this.getDb()
		return db.all<PageRecord[]>(
			`SELECT * FROM pages WHERE section = ? AND status = 'published' ORDER BY sortIndex ASC, date DESC`,
			section
		)
	}

	/** Get all published page paths (for generateStaticParams). */
	async getAllPublishedPaths(): Promise<string[]> {
		const db = await this.getDb()
		const rows = await db.all<{ path: string }[]>(
			`SELECT path FROM pages WHERE status = 'published'`
		)
		return rows.map((r) => r.path)
	}

	/** Get all items in a collection, sorted by sortIndex. */
	async getCollection(name: string): Promise<CollectionItemRecord[]> {
		const db = await this.getDb()
		return db.all<CollectionItemRecord[]>(
			`SELECT * FROM collection_items WHERE collection = ? ORDER BY sortIndex ASC`,
			name
		)
	}

	/** Get collection items that have a specific tag. */
	async getCollectionByTag(name: string, tag: string): Promise<CollectionItemRecord[]> {
		const db = await this.getDb()
		return db.all<CollectionItemRecord[]>(
			`SELECT ci.* FROM collection_items ci, json_each(ci.tags) jt
			 WHERE ci.collection = ? AND jt.value = ?
			 ORDER BY ci.sortIndex ASC`,
			name,
			tag
		)
	}

	/** Get a single collection item by collection name and item slug. */
	async getCollectionItem(
		collection: string,
		slug: string
	): Promise<CollectionItemRecord | undefined> {
		const db = await this.getDb()
		const id = `${collection}/${slug}`
		return db.get<CollectionItemRecord>(`SELECT * FROM collection_items WHERE id = ?`, id)
	}

	/** Get random items from a collection, optionally filtered by tag. */
	async getRandomFromCollection(
		name: string,
		count: number,
		tag?: string
	): Promise<CollectionItemRecord[]> {
		const db = await this.getDb()
		if (tag) {
			return db.all<CollectionItemRecord[]>(
				`SELECT ci.* FROM collection_items ci, json_each(ci.tags) jt
				 WHERE ci.collection = ? AND jt.value = ?
				 ORDER BY RANDOM() LIMIT ?`,
				name,
				tag,
				count
			)
		}
		return db.all<CollectionItemRecord[]>(
			`SELECT * FROM collection_items WHERE collection = ? ORDER BY RANDOM() LIMIT ?`,
			name,
			count
		)
	}

	/** Get all published pages whose path starts with the given prefix. */
	async getPagesByPathPrefix(prefix: string): Promise<PageRecord[]> {
		const db = await this.getDb()
		return db.all<PageRecord[]>(
			`SELECT * FROM pages WHERE path LIKE ? AND status = 'published' ORDER BY sortIndex ASC, path ASC`,
			`${prefix}%`
		)
	}

	/** Get headings for a page. */
	async getHeadings(pageId: string): Promise<HeadingRecord[]> {
		const db = await this.getDb()
		return db.all<HeadingRecord[]>(
			`SELECT * FROM headings WHERE pageId = ? ORDER BY id ASC`,
			pageId
		)
	}
}

export const db = new ContentDatabase()
