import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import {
	Article,
	ArticleStatus,
	Articles,
	Category,
	InputCategory,
	InputSection,
	Section,
} from '../../types/content-types'
import { CONTENT_DIR } from './utils'

export function generateSection(section: InputSection, articles: Articles, index: number): Section {
	const { id: sectionId, sidebar_behavior, categories: sectionCategories } = section

	function assignToArticles(key: string, article: Article) {
		if (articles[key]) throw Error(`Duplicate article key: ${key}`)
		articles[key] = article
	}

	const isExamplesSection = sectionId === 'examples'
	const isReferenceSection = sectionId === 'reference'
	const skipUnpublishedArticles = process.env.NODE_ENV !== 'development' && !isExamplesSection

	// Uncategorized articles
	const sectionUncategorizedArticles: Article[] = []

	// A temporary table of articles mapped to categories
	const sectionCategoryArticles: Record<string, Article[]> = Object.fromEntries(
		section.categories.map((category) => [category.id, []])
	)

	// Create the article files for this section
	const dir = isExamplesSection
		? path.join(process.cwd(), '..', 'examples', 'src', 'examples')
		: path.join(CONTENT_DIR, sectionId)
	const files = fs.readdirSync(dir, { withFileTypes: false })

	for (const file of files) {
		const filename = file.toString()
		if (filename.startsWith('.')) continue

		// Get the parsed file content using matter
		const pathname = isExamplesSection
			? path.join(dir, filename, 'README.md')
			: path.join(dir, filename)
		const fileContent = fs.readFileSync(pathname).toString()
		const parsed = matter({ content: fileContent }, {})

		if (skipUnpublishedArticles && parsed.data.status !== 'published') continue

		const extension = path.extname(filename)
		const articleId = filename.replace(extension, '')

		const article = getArticleData({
			articleId,
			sectionId,
			parsed,
			isGenerated: isReferenceSection,
			extension,
			componentCode: getComponentCode({ dir, filename, parsed }),
			componentCodeFiles: getComponentCodeFiles({ dir, filename, parsed }),
		})

		if (articleId === section.id) {
			// The article is an index page, ie docs/docs
			article.categoryIndex = -1
			article.sectionIndex = -1
			assignToArticles(section.id + '_index', article)
		} else {
			// If the article is in a category and that category exists...
			if (article.categoryId && sectionCategoryArticles[article.categoryId]) {
				// The article is a category index page, ie docs/editor/editor
				if (article.id === article.categoryId) {
					article.categoryIndex = -1
					article.sectionIndex = -1
					assignToArticles(article.categoryId + '_index', article)
				} else {
					// Otherwise, add it to the category's list of articles
					sectionCategoryArticles[article.categoryId].push(article)
				}
			} else {
				// otherwise, add it to the section's uncategorized list
				sectionUncategorizedArticles.push(article)
			}
		}
	}

	// Crate the categories
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
		...sectionCategories
			.filter((inputCategory) => sectionCategoryArticles[inputCategory.id].length > 0)
			.map((inputCategory, i) =>
				getCategory({
					index: i + 1,
					sectionId,
					inputCategory,
				})
			),
	]

	// Finish the articles now that we have all of the categories done.
	// Keep track of the section index through all of the sorted category articles.
	// The section index is the "flattened" index of the article in the section.
	let articleSectionIndex = 0
	categories.forEach((category) => {
		const categoryArticles =
			category.id === section.id + '_ucg'
				? sectionUncategorizedArticles
				: sectionCategoryArticles[category.id]

		categoryArticles.sort(sortArticles).forEach((article, i) => {
			article.categoryIndex = i
			article.sectionIndex = articleSectionIndex
			assignToArticles(article.id, article)
			articleSectionIndex++
		})
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
		authorId: author,
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

function getCategory({
	inputCategory,
	sectionId,
	index,
}: {
	index: number
	sectionId: Section['id']
	inputCategory: InputCategory
}): Category {
	return {
		...inputCategory,
		type: 'category',
		sectionId,
		index,
		path: `/${sectionId}/${inputCategory.id}`,
		content: null,
		hero: null,
		groups: inputCategory.groups.map(({ id }, i) => ({
			id,
			title: id,
			index: i,
			type: 'group',
			sectionId,
			categoryId: inputCategory.id,
			description: null,
			content: null,
			path: `/${sectionId}/${inputCategory.id}/${id}`,
		})),
	}
}
