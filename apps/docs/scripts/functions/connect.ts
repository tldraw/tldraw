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
		// Create the authors table if it does not exist

		await db.run(`DROP TABLE IF EXISTS authors`)
		await db.run(`CREATE TABLE IF NOT EXISTS authors (
			id TEXT PRIMARY_KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL,
			twitter TEXT NOT NULL,
			image TEXT NOT NULL
		)`)

		// Create the sections table if it does not exist

		await db.run(`DROP TABLE IF EXISTS sections`)
		await db.run(`CREATE TABLE sections (
			id TEXT PRIMARY KEY,
			idx INTEGER NOT NULL,
			title TEXT NOT NULL,
			path TEXT NOT NULL,
			description TEXT,
			sidebar_behavior TEXT
		)`)

		// Create the categories table if it does not exist

		await db.run(`DROP TABLE IF EXISTS categories`)
		await db.run(`CREATE TABLE IF NOT EXISTS categories (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT,
			sectionId TEXT NOT NULL,
			sectionIndex INTEGER NOT NULL,
			path TEXT,
			FOREIGN KEY (id) REFERENCES sections(id)
		)`)

		// Create the articles table if it does not exist

		// drop the table if it exists

		await db.run(`DROP TABLE IF EXISTS articles`)
		await db.run(`CREATE TABLE IF NOT EXISTS articles (
			id TEXT PRIMARY KEY,
			groupIndex INTEGER NOT NULL,
			categoryIndex INTEGER NOT NULL,
			sectionIndex INTEGER NOT NULL,
			groupId TEXT,
			categoryId TEXT NOT NULL,
			sectionId TEXT NOT NULL,
			authorId TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			hero TEXT,
			status TEXT NOT NULL,
			date TEXT,
			sourceUrl TEXT,
			componentCode TEXT,
			componentCodeFiles TEXT,
			keywords TEXT,
			content TEXT NOT NULL,
			path TEXT,
			FOREIGN KEY (authorId) REFERENCES authors(id),
			FOREIGN KEY (sectionId) REFERENCES sections(id),
			FOREIGN KEY (categoryId) REFERENCES categories(id)
		)`)

		await db.run(`DROP TABLE IF EXISTS headings`)
		await db.run(`CREATE TABLE IF NOT EXISTS headings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			idx INTEGER NOT NULL,
			articleId TEXT NOT NULL,
			level INTEGER NOT NULL,
			title TEXT NOT NULL,
			slug TEXT NOT NULL,
			isCode BOOL NOT NULL,
			path TEXT NOT NULL,
			FOREIGN KEY (articleId) REFERENCES articles(id)
		)`)
	}

	return db
}
