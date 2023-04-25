import { serialize } from 'next-mdx-remote/serialize'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug-custom-id'
import remarkGfm from 'remark-gfm'
import { scope } from '../components/mdx-components'
import { Article, GeneratedContent, Section, Status } from '../types/content-types'

import jsonContent from '../content.json' // this won't be here until we've run generate-content

export async function getMdxSource(source: string) {
	return serialize(source, {
		scope,
		mdxOptions: {
			remarkPlugins: [remarkGfm],
			rehypePlugins: [
				rehypeHighlight,
				rehypeAutolinkHeadings,
				[rehypeSlug, { enableCustomId: true, maintainCase: false, removeAccents: true }],
			],
		},
	})
}

export async function getContent(): Promise<GeneratedContent> {
	return jsonContent as any
}

export async function getMarkdownContent() {
	return (await getContent()).content as Record<string, string>
}

export async function getArticles() {
	return (await getContent()).articles as Record<string, Article>
}

export async function getSections() {
	return (await getContent()).sections as Section[]
}

export async function getSection(sectionId: string) {
	const sections = await getSections()
	return sections.find((section) => section.id === sectionId)!
}

export async function getCategories(sectionId: string) {
	return Object.values((await getSection(sectionId)).categories!)
}

export async function getCategory(sectionId: string, id: string) {
	return (await getSection(sectionId)).categories!.find((c) => c.id === id)!
}

export async function getCategoryItems(sectionId: string, id: string) {
	const section = await getSection(sectionId)
	const category = section.categories!.find((c) => c.id === id)!
	const articles = await getArticles()
	return category.articleIds.map((id) => articles[id])
}

export async function getArticle(articleId: string) {
	const article = (await getArticles())[articleId]
	if (process.env.NODE_ENV !== 'development' && article.status !== Status.Published) {
		throw Error(`Could not find a article with articleId ${articleId}`)
	}
	return article
}

export async function getArticleSource(articleId: string) {
	const markdown = await getMarkdownContent()
	return getMdxSource(markdown[articleId])
}

export async function getLinks(articleId: string) {
	const article = (await getArticles())[articleId]
	if (!article) throw Error(`Could not find a article with articleId ${articleId}`)
	return {
		prev: article.prev ? await getArticle(article.prev) : null,
		next: article.next ? await getArticle(article.next) : null,
	}
}

export async function getArticlePathsForSection(sectionId: string) {
	const section = await getSection(sectionId)
	return section.categories.map((category) => ({
		params: { sectionId, categoryId: category.id },
	}))
}

export async function getArticlePathsForCategory(sectionId: string, categoryId: string) {
	const section = await getSection(sectionId)
	const category = section.categories!.find((c) => c.id === categoryId)!
	return category.articleIds.map((articleId) => ({
		params: { sectionId, categoryId, articleId },
	}))
}

export async function getCategoryPaths(sectionId: string) {
	const section = await getSection(sectionId)
	const results: { params: { sectionId: string; categoryId: string } }[] = []
	if (section.categories) {
		for (const category of section.categories) {
			// for (const articleId of category.articleIds) {
			results.push({ params: { sectionId, categoryId: category.id } })
			// }
		}
	}

	return results
}

export async function getAllSlugsForSection(sectionId: string) {
	const section = await getSection(sectionId)
	const results: { params: { sectionId: string; categoryId: string; articleId: string } }[] = []
	if (section.categories) {
		for (const category of section.categories) {
			for (const articleId of category.articleIds) {
				results.push({ params: { sectionId, categoryId: category.id, articleId } })
			}
		}
	}

	return results
}
