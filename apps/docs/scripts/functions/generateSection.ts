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
	const isExamples = section.id === 'examples'
	const dir = isExamples
		? path.join(process.cwd(), '..', 'examples', 'src', 'examples')
		: path.join(CONTENT_DIR, section.id)
	const files = fs.readdirSync(dir, { withFileTypes: false })

	const isGenerated = section.id === 'reference'

	for (const file of files) {
		const filename = file.toString()
		if (filename.startsWith('.')) continue
		const pathname = isExamples ? path.join(dir, filename, 'README.md') : path.join(dir, filename)
		const fileContent = fs.readFileSync(pathname).toString()
		const extension = path.extname(filename)
		const articleId = filename.replace(extension, '')

		const parsed = matter({ content: fileContent }, {})

		// If we're in prod and the article isn't published, skip it
		if (
			process.env.NODE_ENV !== 'development' &&
			!isExamples &&
			parsed.data.status !== 'published'
		) {
			continue
		}

		// If a category was provided but that category was not found in the section, throw an error
		const category =
			parsed.data.category && section.categories.find((c) => c.id === parsed.data.category)

		// By default, the category is ucg (uncategorized, with the section id in the id)
		const { category: categoryId = section.id + '_ucg', author = 'api' } = parsed.data

		const isUncategorized = categoryId === section.id + '_ucg'
		const isIndex = articleId === section.id
		const componentCode = parsed.data.component
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
		const componentCodeFiles: { [key: string]: string } = {}
		if (parsed.data.component) {
			const exampleParentDirectory = path.join(dir, filename)
			const codeFilenames = fs.readdirSync(exampleParentDirectory, {
				withFileTypes: true,
				recursive: true,
			})
			codeFilenames
				.filter(
					(file) =>
						!file.isDirectory() &&
						file.name !== 'README.md' &&
						file.name.replace('.tsx', '') !==
							parsed.data.component.replace('./', '').replace('.tsx', '')
				)
				.forEach((file) => {
					componentCodeFiles[file.name] = fs
						.readFileSync(path.join(file.path, file.name))
						.toString()
				})
		}

		const article: Article = {
			id: articleId,
			type: 'article',
			sectionIndex: 0,
			groupIndex: -1,
			groupId: parsed.data.group ?? null,
			categoryIndex: parsed.data.order ?? parsed.data.priority ?? -1,
			sectionId: section.id,
			author,
			categoryId,
			status: parsed.data.status ?? ArticleStatus.Draft,
			title: parsed.data.title ?? 'Untitled article',
			description: parsed.data.description,
			hero: parsed.data.hero ?? null,
			date: parsed.data.date ? new Date(parsed.data.date).toISOString() : null,
			keywords: parsed.data.keywords ?? [],
			sourceUrl: isGenerated // if it's a generated API doc, then we don't have a link
				? parsed.data.sourceUrl ?? null
				: `${section.id}/${articleId}${extension}`,
			componentCode,
			componentCodeFiles: componentCode ? JSON.stringify(componentCodeFiles) : null,
			content: parsed.content,
			path:
				section.id === 'getting-started'
					? `/${articleId}`
					: isUncategorized
						? `/${section.id}/${articleId}`
						: `/${section.id}/${categoryId}/${articleId}`,
		}

		if (isExamples) {
			// split content above the first ---
			const splitUp = parsed.content.split('---\n')
			article.description = splitUp[0]
			article.content = splitUp.slice(1).join('---\n')
		}

		if (isIndex) {
			article.categoryIndex = -1
			article.sectionIndex = -1
			articles[section.id + '_index'] = article
		} else {
			if (category) {
				if (article.id === category.id) {
					article.categoryIndex = -1
					article.sectionIndex = -1
					articles[category.id + '_index'] = article
				} else {
					_categoryArticles[categoryId].push(article)
				}
			} else {
				_ucg.push(article)
			}
		}
	}

	let sectionIndex = 0

	// Sort ucg articles by date and add them to the articles table
	_ucg.sort(sortArticles).forEach((article, i) => {
		article.categoryIndex = i
		article.sectionIndex = sectionIndex
		articles[article.id] = article
		sectionIndex++
	})

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
	section.categories.forEach((inputCategory, i) => {
		const categoryArticles = _categoryArticles[inputCategory.id]

		categoryArticles.sort(sortArticles).forEach((article, i) => {
			article.categoryIndex = i
			article.sectionIndex = sectionIndex
			articles[article.id] = article
			sectionIndex++
		})

		if (categoryArticles.length) {
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

	return {
		...section,
		type: 'section',
		sidebar_behavior: section.sidebar_behavior,
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
