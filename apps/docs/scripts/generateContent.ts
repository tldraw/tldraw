import { ApiModel } from '@microsoft/api-extractor-model'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import authors from '../content/authors.json'
import sections from '../content/sections.json'
import {
	Article,
	Articles,
	Category,
	GeneratedContent,
	Group,
	MarkdownContent,
	Section,
	Status,
} from '../types/content-types'
import { getApiMarkdown } from './getApiMarkdown'
import { getSlug } from './utils'

const { log } = console

type InputCategory = {
	id: string
	title: string
	description: string
	groups: Group[]
}

type InputSection = {
	id: string
	title: string
	description: string
	categories: InputCategory[]
}

function generateSection(
	section: InputSection,
	content: MarkdownContent,
	articles: Articles
): Section {
	// A temporary table of categories
	const _categories: Record<string, Category> = {}

	// Uncategorized articles
	const _ucg: Article[] = []

	// A temporary table of articles mapped to categories
	const _categoryArticles: Record<string, Article[]> = Object.fromEntries(
		section.categories.map((category) => [category.id, []])
	)

	// The file directory for this section
	const dir = path.join(process.cwd(), 'content', section.id)

	fs.readdirSync(dir, { withFileTypes: false }).forEach((result: string | Buffer) => {
		try {
			const filename = result.toString()

			const fileContent = fs.readFileSync(path.join(dir, filename)).toString()

			const extension = path.extname(filename)

			const articleId = filename.replace(extension, '')

			const parsed = matter({ content: fileContent }, {})

			if (process.env.NODE_ENV !== 'development' && parsed.data.status !== 'published') {
				return
			}

			// If a category was provided but that category was not found in the section, throw an error
			const category =
				parsed.data.category && section.categories.find((c) => c.id === parsed.data.category)
			if (parsed.data.category && !category) {
				throw Error(
					`Could not find a category for section ${section.id} with id ${parsed.data.category}.`
				)
			}

			if (parsed.data.author && !authors[parsed.data.author as keyof typeof authors]) {
				throw Error(`Could not find an author with id ${parsed.data.author}.`)
			}

			// By default, the category is ucg (uncategorized)
			const { category: categoryId = 'ucg' } = parsed.data

			const article: Article = {
				id: articleId,
				sectionIndex: 0,
				groupIndex: -1,
				groupId: parsed.data.group ?? null,
				categoryIndex: parsed.data.order ?? -1,
				sectionId: section.id,
				categoryId: parsed.data.category ?? 'ucg',
				status: parsed.data.status ?? Status.Draft,
				title: parsed.data.title ?? 'Article',
				description: parsed.data.description ?? 'An article for the docs site.',
				hero: parsed.data.hero ?? null,
				date: parsed.data.date ? new Date(parsed.data.date).toISOString() : null,
				keywords: parsed.data.keywords ?? [],
				next: null,
				prev: null,
				author: parsed.data.author
					? authors[parsed.data.author as keyof typeof authors] ?? null
					: null,
				sourceUrl: `https://github.com/tldraw/tldraw/tree/main/apps/docs/content/${section.id}/${articleId}${extension}`,
			}

			if (article.id === section.id) {
				article.categoryIndex = -1
				article.sectionIndex = -1
				articles[section.id + '_index'] = article
				content[section.id + '_index'] = parsed.content
			} else {
				if (category) {
					if (article.id === category.id) {
						article.categoryIndex = -1
						article.sectionIndex = -1
						articles[category.id + '_index'] = article
						content[category.id + '_index'] = parsed.content
					} else {
						_categoryArticles[categoryId].push(article)
						content[articleId] = parsed.content
					}
				} else {
					_ucg.push(article)
					content[articleId] = parsed.content
				}
			}
		} catch (e) {
			console.error(e)
		}
	})

	const sortArticles = (articleA: Article, articleB: Article) => {
		const { categoryIndex: categoryIndexA, date: dateA = '01/01/1970' } = articleA
		const { categoryIndex: categoryIndexB, date: dateB = '01/01/1970' } = articleB

		return categoryIndexA === categoryIndexB
			? new Date(dateB!).getTime() > new Date(dateA!).getTime()
				? 1
				: -1
			: categoryIndexA < categoryIndexB
			? -1
			: 1
	}

	let sectionIndex = 0

	// Sort ucg articles by date and add them to the articles table
	_ucg.sort(sortArticles).forEach((article, i) => {
		article.categoryIndex = i
		article.sectionIndex = sectionIndex++
		article.prev = _ucg[i - 1]?.id ?? null
		article.next = _ucg[i + 1]?.id ?? null
		articles[article.id] = article
	})

	// Sort categorized articles by date and add them to the articles table
	section.categories.forEach((category) => {
		const categoryArticles = _categoryArticles[category.id]

		categoryArticles.sort(sortArticles).forEach((article, i) => {
			article.categoryIndex = i
			article.sectionIndex = sectionIndex++
			article.prev = categoryArticles[i - 1]?.id ?? null
			article.next = categoryArticles[i + 1]?.id ?? null
			articles[article.id] = article
		})

		_categories[category.id] = {
			...category,
			articleIds: categoryArticles.map((article) => article.id),
		}
	})

	return {
		...section,
		categories: [
			{
				id: 'ucg',
				title: 'Uncategorized',
				description: 'Articles that do not belong to a category.',
				groups: [],
				articleIds: _ucg
					.sort((a, b) => a.sectionIndex - b.sectionIndex)
					.map((article) => article.id),
			},
			...section.categories.map(({ id }) => _categories[id]).filter((c) => c.articleIds.length > 0),
		],
	}
}

async function generateApiDocs() {
	const apiInputSection: InputSection = {
		id: 'gen' as string,
		title: 'API',
		description: "Reference for the tldraw package's APIs (generated).",
		categories: [],
	}

	const addedCategories = new Set<string>()

	const OUTPUT_DIR = path.join(process.cwd(), 'content', 'gen')

	if (fs.existsSync(OUTPUT_DIR)) {
		fs.rmdirSync(OUTPUT_DIR, { recursive: true })
	}

	fs.mkdirSync(OUTPUT_DIR)

	// to include more packages in docs, add them to devDependencies in package.json
	const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
	const tldrawPackagesToIncludeInDocs = Object.keys(packageJson.devDependencies).filter((dep) =>
		dep.startsWith('@tldraw/')
	)

	const model = new ApiModel()
	for (const packageName of tldrawPackagesToIncludeInDocs) {
		// Get the file contents
		const filePath = path.join(
			process.cwd(),
			'..',
			'..',
			'packages',
			packageName.replace('@tldraw/', ''),
			'api',
			'api.json'
		)

		const packageModel = model.loadPackage(filePath)

		const categoryName = packageModel.name.replace(`@tldraw/`, '')

		if (!addedCategories.has(categoryName)) {
			apiInputSection.categories!.push({
				id: categoryName,
				title: packageModel.name,
				description: '',
				groups: [
					{
						id: 'Namespace',
						title: 'Namespaces',
					},
					{
						id: 'Class',
						title: 'Classes',
					},
					{
						id: 'Function',
						title: 'Functions',
					},
					{
						id: 'Variable',
						title: 'Variables',
					},
					{
						id: 'Enum',
						title: 'Enums',
					},
					{
						id: 'Interface',
						title: 'Interfaces',
					},
					{
						id: 'TypeAlias',
						title: 'TypeAliases',
					},
				],
			})
			addedCategories.add(categoryName)
		}

		const entrypoint = packageModel.entryPoints[0]

		for (let j = 0; j < entrypoint.members.length; j++) {
			const item = entrypoint.members[j]
			const result = await getApiMarkdown(categoryName, item, j)
			const outputFileName = `${getSlug(item)}.mdx`
			fs.writeFileSync(path.join(OUTPUT_DIR, outputFileName), result.markdown)
		}
	}

	return apiInputSection
}

export async function generateContent(): Promise<GeneratedContent> {
	const content: MarkdownContent = {}
	const articles: Articles = {}

	const apiSection = await generateApiDocs()

	log('• Generating site content (content.json)')

	try {
		const outputSections: Section[] = [...(sections as InputSection[]), apiSection]
			.map((section) => generateSection(section, content, articles))
			.filter((section) => section.categories.some((c) => c.articleIds.length > 0))

		log('✔ Generated site content.')

		// Write to disk

		const contentComplete = { sections: outputSections, content, articles }

		fs.writeFileSync(
			path.join(process.cwd(), 'content.json'),
			JSON.stringify(contentComplete, null, 2)
		)

		return contentComplete
	} catch (error) {
		log(`x Could not generate site content.`)

		throw error
	}
}
