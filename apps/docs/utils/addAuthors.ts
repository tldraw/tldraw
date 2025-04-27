import { Authors } from '@/types/content-types'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'

// Adding content
export async function addAuthors(db: Database, authors: Authors) {
	const authorInsert = await db.prepare(
		`REPLACE INTO authors (id, name, email, twitter, image) VALUES (?, ?, ?, ?, ?)`
	)
	// update authors
	for (const author of authors) {
		await authorInsert.run(author.id, author.name, author.email, author.twitter, author.image)
	}
}
