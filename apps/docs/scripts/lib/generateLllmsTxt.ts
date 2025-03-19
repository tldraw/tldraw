import fs from 'fs'
import path from 'path'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import { PUBLIC_DIR } from './utils'

type DbType = Database<sqlite3.Database, sqlite3.Statement>

export async function generateLlmsTxt(db: DbType) {
	const overviewMarkdown = await getMarkdownForOverview(db)
	const examplesMarkdown = await getMarkdownForExamples(db)
	const docsMarkdown = await getMarkdownForDocs(db)

	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), overviewMarkdown)
	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), `${docsMarkdown}\n${examplesMarkdown}`)
	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-examples.txt'), examplesMarkdown)
	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-docs.txt'), docsMarkdown)
}

async function getMarkdownForOverview(db: DbType) {
	let result = `# tldraw SDK\n\n`

	const guides = await db.all(
		'SELECT * FROM articles WHERE sectionId = "docs" OR sectionId = "getting-started"'
	)
	const examples = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	result += `## Guides\n\n`
	for (const guide of guides) {
		result += `- [${guide.title}](https://tldraw.dev/docs/${guide.id})\n`
	}

	result += `\n## Examples\n\n`
	for (const example of examples) {
		result += `- [${example.title}](https://tldraw.dev/examples/${example.id})\n`
	}

	result += `\n## Markdown exports of resources\n`
	result += `\n- [All guides and examples](https://tldraw.dev/llms-full.txt)`
	result += `\n- [Guides only](https://tldraw.dev/llms-docs.txt)`
	result += `\n- [Examples only](https://tldraw.dev/llms-examples.txt)`

	return result
}

async function getMarkdownForDocs(db: DbType) {
	const lines = []
	const guides = await db.all(
		'SELECT * FROM articles WHERE sectionId = "docs" OR sectionId = "getting-started"'
	)

	lines.push(`# tldraw SDK Documentation`)
	for (const guide of guides) {
		lines.push(``)
		lines.push(`## ${guide.title}`)
		lines.push(``)
		lines.push(`${guide.content.trim()}`)
	}

	return lines.join('\n')
}

async function getMarkdownForExamples(db: DbType) {
	const examples = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	const lines = []
	lines.push(`# tldraw SDK Examples`)
	for (const example of examples) {
		lines.push(``)
		lines.push(`## ${example.title}`)
		lines.push(``)

		// I think the categories are confusing the model, so I'm removing them.
		// It's hyper-focusing on some examples and ignoring others.
		// Keywords seem to be more helpful.
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

		lines.push(getMarkdownForFile('App.tsx', example.componentCode))

		const files = JSON.parse(example.componentCodeFiles)
		for (const name in files) {
			lines.push(getMarkdownForFile(name, files[name]))
		}
	}

	return lines.join('\n')
}

const ALLOWED_FILE_TYPES = ['tsx', 'ts', 'js', 'jsx', 'json', 'md', 'css', 'html']
function getMarkdownForFile(fileName: string, fileContent: string) {
	const lines = []
	const type = fileName.split('.').pop()

	// Skip non-code files, eg: PDFs, PNGs
	if (!ALLOWED_FILE_TYPES.includes(type ?? '')) {
		return
	}

	lines.push(`### ${fileName}`)
	lines.push(``)
	lines.push(`\`\`\`${type}`)
	lines.push(fileContent.trim())
	lines.push(`\`\`\``)

	return lines.join('\n')
}
