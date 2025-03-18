import fs from 'fs'
import path from 'path'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import { CONTENT_DIR } from './utils'
const { log: nicelog } = console

export async function generateLlmsTxt(db: Database<sqlite3.Database, sqlite3.Statement>) {
	const examplesDbQuery = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	const lines = []
	lines.push(`# tldraw SDK Examples`)
	lines.push(``)

	for (const example of examplesDbQuery) {
		lines.push(`## ${example.title}`)
		lines.push(``)
		lines.push(`Keywords: ${example.keywords}`)
		lines.push(``)
		lines.push(`${example.content}`)
		lines.push(``)
		lines.push(`\`\`\`tsx`)
		lines.push(`${example.componentCode}`)
		lines.push(`\`\`\``)
		lines.push(``)
	}

	fs.writeFileSync(path.join(CONTENT_DIR, 'llms.txt'), lines.join('\n'))
}
