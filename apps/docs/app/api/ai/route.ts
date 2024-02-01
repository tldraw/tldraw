import { SearchResult } from '@/types/search-types'
import { getDb } from '@/utils/ContentDatabase'
import assert from 'assert'
import { NextRequest } from 'next/server'

type Data = {
	results: {
		articles: SearchResult[]
		apiDocs: SearchResult[]
	}
	status: 'success' | 'error' | 'no-query'
}

const BANNED_HEADINGS = ['new', 'constructor', 'properties', 'example', 'methods']

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const query = searchParams.get('q')?.toLowerCase()
	if (!query) {
		return new Response(
			JSON.stringify({
				results: {
					articles: [],
					apiDocs: [],
				},
				status: 'error',
				error: 'No query',
			}),
			{
				status: 400,
			}
		)
	}

	try {
		const results: Data['results'] = {
			articles: [],
			apiDocs: [],
		}
		const db = await getDb()

		const getVectorDb = (await import('@/utils/ContentVectorDatabase')).getVectorDb

		const vdb = await getVectorDb()
		const queryResults = await vdb.query(query, 25)
		queryResults.sort((a, b) => b.score - a.score)
		const headings = await Promise.all(
			queryResults.map(async (result) => {
				if (result.type !== 'heading') return // bleg
				const article = await db.db.get(
					`SELECT id, title, description, categoryId, sectionId, keywords FROM articles WHERE id = ?`,
					result.id
				)
				assert(article, `No article found for heading ${result.id}`)
				const category = await db.db.get(
					`SELECT id, title FROM categories WHERE id = ?`,
					article.categoryId
				)
				const section = await db.db.get(
					`SELECT id, title FROM sections WHERE id = ?`,
					article.sectionId
				)
				const heading = await db.db.get(`SELECT * FROM headings WHERE slug = ?`, result.slug)
				assert(heading, `No heading found for ${result.id} ${result.slug}`)
				return {
					id: result.id,
					article,
					category,
					section,
					heading,
					score: result.score,
				}
			})
		)
		const visited = new Set<string>()
		for (const result of headings) {
			if (!result) continue
			if (visited.has(result.id)) continue
			visited.add(result.id)
			const { category, section, article, heading, score } = result
			const isUncategorized = category.id === section.id + '_ucg'
			if (BANNED_HEADINGS.some((h) => heading.slug.endsWith(h))) continue
			results[section.id === 'reference' ? 'apiDocs' : 'articles'].push({
				id: result.id,
				type: 'heading',
				subtitle: isUncategorized ? section.title : `${section.title} / ${category.title}`,
				title:
					section.id === 'reference'
						? article.title + '.' + heading.title
						: article.title + ': ' + heading.title,
				url: isUncategorized
					? `${section.id}/${article.id}#${heading.slug}`
					: `${section.id}/${category.id}/${article.id}#${heading.slug}`,
				score,
			})
		}
		const articles = await Promise.all(
			queryResults.map(async (result) => ({
				score: result.score,
				article: await db.db.get(
					`SELECT id, title, description, categoryId, sectionId, keywords FROM articles WHERE id = ?`,
					result.id
				),
			}))
		)
		for (const { score, article } of articles.filter(Boolean)) {
			if (visited.has(article.id)) continue
			visited.add(article.id)
			const category = await db.db.get(
				`SELECT id, title FROM categories WHERE categories.id = ?`,
				article.categoryId
			)
			const section = await db.db.get(
				`SELECT id, title FROM sections WHERE sections.id = ?`,
				article.sectionId
			)
			const isUncategorized = category.id === section.id + '_ucg'
			results[section.id === 'reference' ? 'apiDocs' : 'articles'].push({
				id: article.id,
				type: 'article',
				subtitle: isUncategorized ? section.title : `${section.title} / ${category.title}`,
				title: article.title,
				url: isUncategorized
					? `${section.id}/${article.id}`
					: `${section.id}/${category.id}/${article.id}`,
				score,
			})
		}
		const apiDocsScores = results.apiDocs.map((a) => a.score)
		const maxScoreApiDocs = Math.max(...apiDocsScores)
		const minScoreApiDocs = Math.min(...apiDocsScores)
		const apiDocsBottom = minScoreApiDocs + (maxScoreApiDocs - minScoreApiDocs) * 0.75
		results.apiDocs
			.filter((a) => a.score > apiDocsBottom)
			.sort((a, b) => b.score - a.score)
			.sort((a, b) => (b.type === 'heading' ? -1 : 1) - (a.type === 'heading' ? -1 : 1))
			.slice(0, 10)
		const articleScores = results.articles.map((a) => a.score)
		const maxScoreArticles = Math.max(...articleScores)
		const minScoreArticles = Math.min(...articleScores)
		const articlesBottom = minScoreArticles + (maxScoreArticles - minScoreArticles) * 0.5
		results.articles
			.filter((a) => a.score > articlesBottom)
			.sort((a, b) => b.score - a.score)
			.sort((a, b) => (b.type === 'heading' ? -1 : 1) - (a.type === 'heading' ? -1 : 1))
		return new Response(
			JSON.stringify({
				results,
				status: 'success',
			}),
			{
				status: 200,
			}
		)
	} catch (e: any) {
		return new Response(
			JSON.stringify({
				results: {
					articles: [],
					apiDocs: [],
				},
				status: 'error',
				error: e.message,
			}),
			{
				status: 500,
			}
		)
	}
}
