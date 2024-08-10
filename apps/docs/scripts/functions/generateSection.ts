import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import {
	Article,
	ArticleStatus,
	Articles,
	Category,
	InputSection,
	Section,
} from '../../types/content-types'
import { CONTENT_DIR } from '../utils'

export function generateSection(section: InputSection, articles: Articles, index: number): Section {
	// Uncategorized articles
	const _ucg: Article[] = []

	// A temporary table of articles mapped to categories
	const _categoryArticles: Record<string, Article[]> = Object.fromEntries(
		section.categories.map((category) => [category.id, []])
	)

	// The file directory for this section
	const isExamplesSection = section.id === 'examples'
	const dir = isExamplesSection
		? path.join(process.cwd(), '..', 'examples', 'src', 'examples')
		: path.join(CONTENT_DIR, section.id)
	const files = fs.readdirSync(dir, { withFileTypes: false })

	const isGenerated = section.id === 'reference'

	const { id: sectionId, sidebar_behavior, categories: sectionCategories } = section

	const skipUnpublished = process.env.NODE_ENV !== 'development' && !isExamplesSection

	for (const file of files) {
		const filename = file.toString()
		if (filename.startsWith('.')) continue
		const pathname = isExamplesSection
			? path.join(dir, filename, 'README.md')
			: path.join(dir, filename)
		const extension = path.extname(filename)
		const articleId = filename.replace(extension, '')
		const fileContent = fs.readFileSync(pathname).toString()
		const parsed = matter({ content: fileContent }, {})

		// If we're in prod and the article isn't published, skip it
		if (skipUnpublished && parsed.data.status !== 'published') {
			continue
		}

		const article = getArticleData({
			articleId,
			sectionId,
			parsed,
			isGenerated,
			extension,
			componentCode: getComponentCode({ dir, filename, parsed }),
			componentCodeFiles: getComponentCodeFiles({ dir, filename, parsed }),
		})

		const category = sectionCategories.find((c) => c.id === article.categoryId)

		if (articleId === section.id) {
			// The article is an index page, ie docs/docs
			article.categoryIndex = -1
			article.sectionIndex = -1
			articles[section.id + '_index'] = article
		} else {
			// If the article is in a category...
			if (category) {
				// The article is a category index page, ie docs/editor/editor
				if (article.id === category.id) {
					article.categoryIndex = -1
					article.sectionIndex = -1
					articles[category.id + '_index'] = article
				} else {
					// Otherwise, add it to the category's list of articles
					_categoryArticles[article.categoryId].push(article)
				}
			} else {
				// otherwise, add it to the section's uncategorized list
				_ucg.push(article)
			}
		}
	}

	// The section index is the "flattened" index of the article in the section.
	// Keep track of the section index as we go through sorted articles.
	let articleSectionIndex = 0

	// Sort uncategorized articles by date and add them to the articles table
	_ucg.sort(sortArticles).forEach((article, i) => {
		article.categoryIndex = i
		article.sectionIndex = articleSectionIndex
		articles[article.id] = article
		articleSectionIndex++
	})

	// Start with the uncategorized category
	const categories: Category[] = [
		{
			id: section.id + '_ucg',
			type: 'category',
			sectionId: section.id,
			index: 0,
			title: 'Uncategorized',
			description: 'Articles that do not belong to a category.',
			groups: [],
			path: `/${section.id}/ucg`,
			content: null,
			hero: null,
		},
	]

	// Sort categorized articles by date and add them to the articles table
	sectionCategories.forEach((inputCategory, i) => {
		const categoryArticles = _categoryArticles[inputCategory.id]

		if (categoryArticles.length) {
			// Sort the articles by category index and apply their indicese
			categoryArticles.sort(sortArticles).forEach((article, i) => {
				article.categoryIndex = i
				article.sectionIndex = articleSectionIndex
				articles[article.id] = article
				articleSectionIndex++
			})

			// Create the category
			categories.push({
				...inputCategory,
				type: 'category',
				sectionId: section.id,
				index: i + 1,
				path: `/${section.id}/${inputCategory.id}`,
				content: null,
				hero: null,
				groups: inputCategory.groups.map(({ id }, i) => ({
					id,
					title: id,
					index: i,
					type: 'group',
					sectionId: section.id,
					categoryId: inputCategory.id,
					description: null,
					content: null,
					path: `/${section.id}/${inputCategory.id}/${id}`,
				})),
			})
		}
	})

	// Section is done, return it
	return {
		...section,
		type: 'section',
		sidebar_behavior,
		index,
		categories,
		content: '',
		hero: section.hero ?? null,
		path: `/${section.id}`,
	}
}

const sortArticles = (articleA: Article, articleB: Article) => {
	const { categoryIndex: categoryIndexA, title: titleA } = articleA
	const { categoryIndex: categoryIndexB, title: titleB } = articleB

	return categoryIndexA === categoryIndexB
		? titleA.localeCompare(titleB)
		: categoryIndexA - categoryIndexB
}

function getArticleData({
	articleId,
	sectionId,
	parsed,
	isGenerated,
	extension,
	componentCode,
	componentCodeFiles,
}: {
	articleId: Article['id']
	sectionId: Section['id']
	parsed: matter.GrayMatterFile<string>
	isGenerated: boolean
	extension: string
	componentCode: string | null
	componentCodeFiles: { [key: string]: string }
}): Article {
	const {
		group = null,
		priority = -1,
		hero = null,
		author = 'api',
		status = ArticleStatus.Draft,
		title = 'Untitled article',
		description = null,
		keywords = [],
		date = null,
		sourceUrl = null,
		order,
		apiTags = null,
		category: categoryId = sectionId + '_ucg',
	} = parsed.data

	const { content } = parsed

	const article: Article = {
		id: articleId,
		type: 'article',
		sectionIndex: 0,
		groupIndex: -1,
		groupId: group,
		categoryIndex: order ?? priority,
		sectionId: sectionId,
		author: [author],
		categoryId,
		status,
		title,
		description,
		hero,
		date: date ? new Date(date).toISOString() : null,
		keywords,
		sourceUrl: isGenerated // if it's a generated API doc, then we don't have a link
			? sourceUrl
			: `${sectionId}/${articleId}${extension}`,
		content,
		apiTags,
		path:
			sectionId === 'getting-started'
				? `/${articleId}`
				: categoryId === sectionId + '_ucg'
					? `/${sectionId}/${articleId}` // index page
					: `/${sectionId}/${categoryId}/${articleId}`,
		componentCode,
		componentCodeFiles: componentCode ? JSON.stringify(componentCodeFiles) : null,
	}

	if (sectionId === 'examples' && article.content) {
		const splitUp = article.content.split('---\n')
		article.description = splitUp[0]
		article.content = splitUp.slice(1).join('---\n')
	}

	return article
}

function getComponentCode({
	dir,
	filename,
	parsed,
}: {
	dir: string
	filename: string
	parsed: matter.GrayMatterFile<string>
}) {
	return parsed.data.component
		? fs
				.readFileSync(
					path.join(
						dir,
						filename,
						`${parsed.data.component}${parsed.data.component.endsWith('.tsx') ? '' : '.tsx'}`
					)
				)
				.toString()
		: null
}

function getComponentCodeFiles({
	dir,
	filename,
	parsed,
}: {
	dir: string
	filename: string
	parsed: matter.GrayMatterFile<string>
}) {
	const componentCodeFiles: { [key: string]: string } = {}

	if (parsed.data.component) {
		// Get the files from the example directory
		fs.readdirSync(path.join(dir, filename), {
			withFileTypes: true,
			recursive: true,
		})
			// filter the files to only include files that are not directories, not the README, and not the component itself
			.filter(
				(file) =>
					!file.isDirectory() &&
					file.name !== 'README.md' &&
					file.name.replace('.tsx', '') !==
						parsed.data.component.replace('./', '').replace('.tsx', '')
			)
			// For each of these component files, read the file and add it to the componentCodeFiles object
			.forEach((file) => {
				componentCodeFiles[file.name] = fs.readFileSync(path.join(file.path, file.name)).toString()
			})
	}

	return componentCodeFiles
}
