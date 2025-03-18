import fs from 'fs'
import path from 'path'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import { PUBLIC_DIR } from './utils'

export async function generateLlmsTxt(db: Database<sqlite3.Database, sqlite3.Statement>) {
	const docsDbQuery = await db.all('SELECT * FROM articles WHERE sectionId = "docs"')
	const examplesDbQuery = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	const lines = []

	lines.push(`# tldraw SDK Documentation`)
	lines.push(``)
	for (const guide of docsDbQuery) {
		lines.push(`## ${guide.title}`)
		lines.push(``)
		lines.push(`${guide.content.trim()}`)
	}

	lines.push(`# tldraw SDK Examples`)
	lines.push(``)
	for (const example of examplesDbQuery) {
		lines.push(`## ${example.title}`)
		lines.push(``)

		// I think the categories are confusing the model, so I'm removing them
		// It's hyper-focusing on some of them and ignoring others
		// Keywords seem to be more helpful to it
		// const category = example.categoryId[0].toUpperCase() + example.categoryId.slice(1).replaceAll('-', ' ')
		// lines.push(`Category: ${category}`)

		lines.push(`Keywords: ${example.keywords.trim()}`)
		if (example.description?.trim()) {
			lines.push(``)
			lines.push(`${example.description.trim()}`)
		}
		lines.push(``)
		lines.push(`${example.content.trim()}`)
		lines.push(``)
		addFileToLines(lines, 'App.tsx', example.componentCode)
		const files = JSON.parse(example.componentCodeFiles)
		for (const name in files) {
			const content = files[name]
			addFileToLines(lines, name, content)
		}
		lines.push(``)
	}

	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), lines.join('\n'))
}

const ALLOWED_FILE_TYPES = ['tsx', 'ts', 'js', 'jsx', 'json', 'md', 'css', 'html']

function addFileToLines(lines: string[], name: string, content: string) {
	const type = name.split('.').pop()

	// Skip non-code files, eg: PDFs, PNGs
	if (!ALLOWED_FILE_TYPES.includes(type ?? '')) {
		return
	}

	lines.push(`### ${name}`)
	lines.push(``)
	lines.push(`\`\`\`${type}`)
	lines.push(content.trim())
	lines.push(`\`\`\``)
}
