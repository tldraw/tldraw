import { Article } from '@/types/content-types'
import fs from 'fs'
import path from 'path'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import { CONTENT_DIR } from './utils'
const { log: nicelog } = console

export async function generateLlmsTxt(db: Database<sqlite3.Database, sqlite3.Statement>) {
	nicelog('hello world')

	const examplesDbQuery = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	nicelog('examplesDbQuery', examplesDbQuery.length)

	const lines = []

	lines.push(`# tldraw SDK Examples`)
	lines.push(``)

	for (const example of examplesDbQuery) {
		addExample(lines, example)
	}

	const content = lines.join('\n')

	const OUTPUT_DIR = CONTENT_DIR
	fs.writeFileSync(path.join(OUTPUT_DIR, 'llms.txt'), content)
}

function addExample(lines: string[], example: Article) {
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
