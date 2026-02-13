import fs from 'fs'
import path from 'path'
import { Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import { EXAMPLES_CATEGORIES } from './generateExamplesContent'
import { PUBLIC_DIR } from './utils'

type DbType = Database<sqlite3.Database, sqlite3.Statement>

export async function generateLlmsTxt(db: DbType) {
	const overviewMarkdown = await getMarkdownForOverview(db)
	const examplesMarkdown = await getMarkdownForExamples(db)
	const docsMarkdown = await getMarkdownForDocs(db)
	const releasesMarkdown = await getMarkdownForReleases(db)

	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), overviewMarkdown)
	fs.writeFileSync(
		path.join(PUBLIC_DIR, 'llms-full.txt'),
		`${docsMarkdown}\n--------------------------------\n\n${releasesMarkdown}\n--------------------------------\n\n${examplesMarkdown}`
	)
	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-examples.txt'), examplesMarkdown)
	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-docs.txt'), docsMarkdown)
	fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-releases.txt'), releasesMarkdown)
}

async function getMarkdownForOverview(db: DbType) {
	let result = `# tldraw SDK\n\n`

	const features = await db.all('SELECT * FROM articles WHERE sectionId = "sdk-features"')
	const releases = await db.all(
		'SELECT * FROM articles WHERE sectionId = "releases" ORDER BY id DESC'
	)
	const examples = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	result += `## SDK features\n\n`
	for (const feature of features) {
		result += `- [${feature.title}](https://tldraw.dev${feature.path})\n`
	}

	result += `\n## Releases\n\n`
	for (const release of releases) {
		result += `- [${release.title}](https://tldraw.dev${release.path})\n`
	}

	result += `\n## Examples\n\n`
	for (const example of examples) {
		result += `- [${example.title}](https://tldraw.dev${example.path})\n`
	}

	result += `\n## Markdown exports of resources\n`
	result += `\n- [All SDK features, releases, and examples](https://tldraw.dev/llms-full.txt)`
	result += `\n- [SDK features only](https://tldraw.dev/llms-docs.txt)`
	result += `\n- [Releases only](https://tldraw.dev/llms-releases.txt)`
	result += `\n- [Examples only](https://tldraw.dev/llms-examples.txt)`

	return result
}

async function getMarkdownForDocs(db: DbType) {
	let result = `# tldraw SDK features\n`
	const features = await db.all('SELECT * FROM articles WHERE sectionId = "sdk-features"')

	for (const feature of features) {
		result += `\n--------\n`
		result += `\n# ${feature.title}\n\n${feature.content.trim()}\n`
	}

	return result
}

async function getMarkdownForReleases(db: DbType) {
	let result = `# tldraw SDK releases\n`
	const releases = await db.all(
		'SELECT * FROM articles WHERE sectionId = "releases" ORDER BY id DESC'
	)

	for (const release of releases) {
		result += `\n--------\n`
		result += `\n# ${release.title}\n\n${release.content.trim()}\n`
	}

	return result
}

async function getMarkdownForExamples(db: DbType) {
	const examples = await db.all('SELECT * FROM articles WHERE sectionId = "examples"')

	// Sort examples by category
	const categories = EXAMPLES_CATEGORIES.map((category) => {
		return {
			id: category.id,
			title: category.title,
			examples: examples.filter((example) => example.categoryId === category.id),
		}
	})

	let result = `# tldraw SDK Examples`

	for (const category of categories) {
		for (const example of category.examples) {
			result += `\n\n--------`
			result += `\n\n# ${example.title}`

			result += `\n\nCategory: ${category.title}`
			result += `\n\nKeywords: ${example.keywords.trim()}`
			if (example.description?.trim()) {
				result += `\n\n${example.description.trim()}`
			}

			result += `\n\n${example.content.trim()}`
			result += getMarkdownForFile('App.tsx', example.componentCode)

			const files = JSON.parse(example.componentCodeFiles)
			for (const name in files) {
				result += getMarkdownForFile(name, files[name])
			}
		}
	}

	return result
}

const ALLOWED_FILE_TYPES = ['tsx', 'ts', 'js', 'jsx', 'md', 'css', 'html']
function getMarkdownForFile(fileName: string, fileContent: string) {
	const type = fileName.split('.').pop()

	// Skip non-code files, eg: PDFs, PNGs
	if (!ALLOWED_FILE_TYPES.includes(type ?? '')) {
		return
	}

	let result = `\n\n## ${fileName}`
	result += `\n\n\`\`\`${type}`
	result += `\n${fileContent.trim()}`
	result += `\n\`\`\``
	return result
}
