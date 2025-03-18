import fs from 'fs'
import path from 'path'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import { PUBLIC_DIR } from './utils'

export async function generateLlmsTxt(db: Database<sqlite3.Database, sqlite3.Statement>) {
	const examplesDbQuery = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	const lines = []
	lines.push(`# tldraw SDK Examples`)
	lines.push(``)

	for (const example of examplesDbQuery) {
		lines.push(`## ${example.title}`)
		lines.push(``)
		lines.push(`Keywords: ${example.keywords.trim()}`)
		if (example.description?.trim()) {
			lines.push(``)
			lines.push(`${example.description.trim()}`)
		}
		lines.push(``)
		lines.push(`${example.content.trim()}`)
		lines.push(``)
		lines.push(`### App.tsx`)
		lines.push(``)
		lines.push(`\`\`\`tsx`)
		lines.push(`${example.componentCode.trim()}`)
		lines.push(`\`\`\``)
		lines.push(``)
	}

	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), lines.join('\n'))
}
