import path from 'path'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

export async function connect(opts: { reset?: boolean; mode: 'readonly' | 'readwrite' }) {
	const db = await open({
		filename: path.join(process.cwd(), 'content.db'),
		driver: sqlite3.Database,
		mode:
			opts.mode === 'readonly'
				? sqlite3.OPEN_READONLY
				: sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
	})

	if (opts.reset) {
		await db.run(`DROP TABLE IF EXISTS headings`)
		await db.run(`DROP TABLE IF EXISTS collection_items`)
		await db.run(`DROP TABLE IF EXISTS pages`)

		await db.run(`CREATE TABLE pages (
			id TEXT PRIMARY KEY,
			path TEXT UNIQUE NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			section TEXT NOT NULL,
			layout TEXT NOT NULL DEFAULT 'default',
			status TEXT NOT NULL DEFAULT 'published',
			date TEXT,
			sortIndex INTEGER NOT NULL DEFAULT 0,
			hero TEXT,
			content TEXT NOT NULL,
			metadata TEXT
		)`)

		await db.run(`CREATE TABLE collection_items (
			id TEXT PRIMARY KEY,
			collection TEXT NOT NULL,
			sortIndex INTEGER NOT NULL DEFAULT 0,
			title TEXT,
			tags TEXT,
			content TEXT,
			data TEXT NOT NULL
		)`)

		await db.run(`CREATE TABLE headings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pageId TEXT NOT NULL,
			level INTEGER NOT NULL,
			title TEXT NOT NULL,
			slug TEXT NOT NULL,
			FOREIGN KEY (pageId) REFERENCES pages(id)
		)`)

		await db.run(`CREATE INDEX idx_collection ON collection_items(collection)`)
		await db.run(`CREATE INDEX idx_pages_section ON pages(section)`)
		await db.run(`CREATE INDEX idx_pages_status ON pages(status)`)
		await db.run(`CREATE INDEX idx_headings_page ON headings(pageId)`)
	}

	return db
}
