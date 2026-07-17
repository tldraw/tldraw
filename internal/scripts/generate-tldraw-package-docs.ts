import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const DOCS_SECTION_IDS = ['getting-started', 'docs', 'starter-kits', 'sdk-features', 'community']
const RELEASES_SECTION_ID = 'releases'
const RELEASE_NOTES_FILE_NAME = /^v\d+\.\d+\.\d+\.mdx$/
const NEXT_RELEASE_NOTES_FILE_NAME = 'next.mdx'
const UNWRAPPED_MDX_TAGS = new Set(['Callout', 'Feature', 'FocusLines', 'div'])
const OMITTED_MDX_TAGS = new Set(['Image', 'MaskedArticleImage', 'StarterKitBento', 'img'])

interface Article {
	content: string
	fileName: string
	order: number | null
	sectionId: string
	title: string
	version: [number, number, number] | null
}

interface Section {
	id: string
	title: string
	description?: string
}

export function generateTldrawPackageDocs({
	sourcePackageDir,
	repoRoot = path.resolve(sourcePackageDir, '../..'),
}: {
	sourcePackageDir: string
	repoRoot?: string
}) {
	const packageJsonPath = path.join(sourcePackageDir, 'package.json')
	if (!existsSync(packageJsonPath)) {
		throw new Error(`No package.json file found in '${sourcePackageDir}'!`)
	}

	const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
	const packageVersion = manifest.version
	const contentDir = path.join(repoRoot, 'apps/docs/content')
	const sections = readSections(contentDir)

	writeFileSync(
		path.join(sourcePackageDir, 'DOCS.md'),
		createDocsRollup({ contentDir, packageVersion, sections })
	)
	writeFileSync(
		path.join(sourcePackageDir, 'RELEASE_NOTES.md'),
		createReleaseNotesRollup({ contentDir, packageVersion, sections })
	)
}

export function createDocsRollup({
	contentDir,
	packageVersion,
	sections,
}: {
	contentDir: string
	packageVersion: string
	sections: Section[]
}) {
	const result = [
		'# tldraw Documentation',
		'',
		`Version: \`${packageVersion}\``,
		'',
		'This file is generated during package publishing from the tldraw docs content for this exact package version.',
	]

	for (const sectionId of DOCS_SECTION_IDS) {
		const section = sectionById(sections, sectionId)
		const articles = readArticles(contentDir, sectionId)
		if (!articles.length) continue

		result.push('', `## ${section.title}`)
		if (section.description) result.push('', section.description)

		for (const article of articles) {
			result.push('', `### ${article.title}`, '', normalizeMdxForMarkdown(article.content, 2))
		}
	}

	return result.join('\n').trimEnd() + '\n'
}

export function createReleaseNotesRollup({
	contentDir,
	packageVersion,
	sections,
}: {
	contentDir: string
	packageVersion: string
	sections: Section[]
}) {
	const section = sectionById(sections, RELEASES_SECTION_ID)
	const releaseNotes = readReleaseNotesArticles(contentDir, packageVersion)
		.filter((article): article is Article & { version: [number, number, number] } =>
			Boolean(article.version)
		)
		.sort((a, b) => compareVersions(b.version, a.version))

	const result = [
		`# ${section.title}`,
		'',
		`Version: \`${packageVersion}\``,
		'',
		'This file is generated during package publishing from the tldraw release notes content for this exact package version.',
	]

	for (const article of releaseNotes) {
		result.push('', `## ${article.title}`, '', normalizeMdxForMarkdown(article.content, 1))
	}

	return result.join('\n').trimEnd() + '\n'
}

function readReleaseNotesArticles(contentDir: string, packageVersion: string) {
	const releaseNotes = readArticles(contentDir, RELEASES_SECTION_ID)
	const packageVersionTuple = getStableVersionTuple(packageVersion)

	if (packageVersionTuple) {
		const packageVersionTitle = `v${packageVersionTuple.join('.')}`
		const nextReleaseNotes = readArticle(
			path.join(contentDir, RELEASES_SECTION_ID, NEXT_RELEASE_NOTES_FILE_NAME),
			RELEASES_SECTION_ID,
			NEXT_RELEASE_NOTES_FILE_NAME
		)
		if (
			!releaseNotes.some((article) => article.title === packageVersionTitle) &&
			nextReleaseNotes
		) {
			releaseNotes.push({
				...nextReleaseNotes,
				fileName: `${packageVersionTitle}.mdx`,
				title: packageVersionTitle,
				version: packageVersionTuple,
			})
		}
	}

	return releaseNotes
}

function readSections(contentDir: string): Section[] {
	return JSON.parse(readFileSync(path.join(contentDir, 'sections.json'), 'utf8'))
}

function sectionById(sections: Section[], sectionId: string) {
	const section = sections.find((section) => section.id === sectionId)
	if (!section) {
		throw new Error(`Could not find docs section '${sectionId}'`)
	}
	return section
}

function readArticles(contentDir: string, sectionId: string) {
	const sectionDir = path.join(contentDir, sectionId)
	return readdirSync(sectionDir)
		.filter((fileName) => fileName.endsWith('.mdx') || fileName.endsWith('.md'))
		.filter(
			(fileName) => sectionId !== RELEASES_SECTION_ID || RELEASE_NOTES_FILE_NAME.test(fileName)
		)
		.map((fileName) => readArticle(path.join(sectionDir, fileName), sectionId, fileName))
		.filter((article) => article !== null)
		.sort(sortArticles)
}

function readArticle(filePath: string, sectionId: string, fileName: string): Article | null {
	const { data, content } = parseFrontMatter(readFileSync(filePath, 'utf8'))
	if (data.status !== 'published') return null

	const title = data.title ?? path.basename(fileName, path.extname(fileName))
	const order = data.order ? Number(data.order) : null
	const versionMatch = fileName.match(/^v(\d+)\.(\d+)\.(\d+)\.mdx$/)

	return {
		content,
		fileName,
		order: Number.isFinite(order) ? order : null,
		sectionId,
		title,
		version: versionMatch
			? [Number(versionMatch[1]), Number(versionMatch[2]), Number(versionMatch[3])]
			: null,
	}
}

function parseFrontMatter(raw: string): { data: Record<string, string>; content: string } {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
	if (!match) return { data: {}, content: raw }

	const data: Record<string, string> = {}
	for (const line of match[1].split(/\r?\n/)) {
		const lineMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
		if (!lineMatch) continue

		const [, key, rawValue] = lineMatch
		let value = rawValue.trim()
		if (
			(value.startsWith("'") && value.endsWith("'")) ||
			(value.startsWith('"') && value.endsWith('"'))
		) {
			value = value.slice(1, -1)
		}
		data[key] = value
	}

	return { data, content: raw.slice(match[0].length).trim() }
}

function sortArticles(a: Article, b: Article) {
	const orderA = a.order ?? Number.MAX_SAFE_INTEGER
	const orderB = b.order ?? Number.MAX_SAFE_INTEGER
	if (orderA !== orderB) return orderA - orderB
	return a.title.localeCompare(b.title)
}

function compareVersions(a: [number, number, number], b: [number, number, number]) {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

function getStableVersionTuple(packageVersion: string): [number, number, number] | null {
	const match = packageVersion.match(/^(\d+)\.(\d+)\.(\d+)$/)
	return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

function normalizeMdxForMarkdown(content: string, headingDemotion: number) {
	const result: string[] = []
	let inFence = false
	let omittedMdxTag: string | null = null

	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim()
		if (/^(```|~~~)/.test(trimmed)) {
			inFence = !inFence
			result.push(line)
			continue
		}

		if (!inFence) {
			if (omittedMdxTag) {
				if (trimmed.includes('/>') || trimmed.includes(`</${omittedMdxTag}>`)) {
					omittedMdxTag = null
				}
				continue
			}

			if (/^import\s.+\sfrom\s/.test(trimmed)) continue
			if (/^export\s+(const|function|class|type|interface|default|\{)/.test(trimmed)) continue

			const mdxLine = normalizeMdxLine(trimmed)
			if (mdxLine.kind === 'omit') {
				omittedMdxTag = mdxLine.tag
				continue
			}
			if (mdxLine.kind === 'skip') continue
			if (mdxLine.kind === 'replace') {
				result.push(rewriteLinks(demoteHeading(mdxLine.content, headingDemotion)))
				continue
			}

			result.push(rewriteLinks(demoteHeading(line, headingDemotion)))
		} else {
			result.push(line)
		}
	}

	return result
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

function normalizeMdxLine(
	trimmed: string
):
	| { kind: 'keep' }
	| { kind: 'skip' }
	| { kind: 'omit'; tag: string }
	| { kind: 'replace'; content: string } {
	const checkItemMatch = trimmed.match(/^<CheckItem>(.*?)<\/CheckItem>$/)
	if (checkItemMatch) {
		return { kind: 'replace', content: `- ${checkItemMatch[1]}` }
	}

	const tagName = getMdxTagName(trimmed)
	if (!tagName) return { kind: 'keep' }
	if (tagName === 'br') return { kind: 'skip' }
	if (OMITTED_MDX_TAGS.has(tagName)) {
		return trimmed.includes('/>') || trimmed.includes(`</${tagName}>`)
			? { kind: 'skip' }
			: { kind: 'omit', tag: tagName }
	}
	if (UNWRAPPED_MDX_TAGS.has(tagName)) {
		const title = tagName === 'Feature' ? getMdxStringProp(trimmed, 'title') : null
		return title ? { kind: 'replace', content: `**${title}**` } : { kind: 'skip' }
	}
	if (/^<\/?[A-Z][A-Za-z0-9.]*\b/.test(trimmed)) {
		return { kind: 'skip' }
	}

	return { kind: 'keep' }
}

function getMdxTagName(trimmed: string) {
	const match = trimmed.match(/^<\/?([A-Za-z][A-Za-z0-9.]*)\b/)
	return match?.[1] ?? null
}

function getMdxStringProp(trimmed: string, propName: string) {
	const match = trimmed.match(new RegExp(`\\b${propName}=(?:"([^"]+)"|'([^']+)')`))
	return match?.[1] ?? match?.[2] ?? null
}

function demoteHeading(line: string, headingDemotion: number) {
	return line.replace(/^(#{1,6})(\s+)/, (_, hashes, spacing) => {
		return '#'.repeat(Math.min(6, hashes.length + headingDemotion)) + spacing
	})
}

function rewriteLinks(line: string) {
	return line
		.replace(/\[`?([^[\]]*?)`?\]\(\?\)/g, '`$1`')
		.replace(/\]\((\/[^)\s]+)\)/g, '](https://tldraw.dev$1)')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const scriptDir = path.dirname(fileURLToPath(import.meta.url))
	generateTldrawPackageDocs({
		sourcePackageDir: path.resolve(path.normalize(process.argv[2] ?? process.cwd())),
		repoRoot: path.resolve(scriptDir, '../..'),
	})
}
