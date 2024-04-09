import { SearchResult } from '@/types/search-types'
import { getDb } from '@/utils/ContentDatabase'
import { SEARCH_RESULTS, searchBucket, sectionTypeBucket } from '@/utils/search-api'
import { structuredClone } from '@tldraw/utils'
import { NextRequest } from 'next/server'

type Data = {
	results: {
		articles: SearchResult[]
		apiDocs: SearchResult[]
		examples: SearchResult[]
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
				results: structuredClone(SEARCH_RESULTS),
				status: 'no-query',
			}),
			{
				status: 400,
			}
		)
	}

	try {
		const results: Data['results'] = structuredClone(SEARCH_RESULTS)
		const db = await getDb()
		const searchForArticle = await db.db.prepare(
			`
	SELECT id, title, sectionId, categoryId, content
	FROM ftsArticles
	WHERE ftsArticles MATCH ?
	ORDER BY bm25(ftsArticles, 1000.0)
`,
			query
		)

		await searchForArticle.all().then(async (queryResults) => {
			for (const article of queryResults) {
				const section = await db.getSection(article.sectionId)
				const category = await db.getCategory(article.categoryId)
				const isUncategorized = category.id === section.id + '_ucg'

				results[searchBucket(article.sectionId)].push({
					id: article.id,
					type: 'article',
					subtitle: isUncategorized ? section.title : `${section.title} / ${category.title}`,
					title: article.title,
					sectionType: sectionTypeBucket(section.id),
					url: isUncategorized
						? `${section.id}/${article.id}`
						: `${section.id}/${category.id}/${article.id}`,
					score: 0,
				})
			}
		})

		const searchForArticleHeadings = await db.db.prepare(
			`
	SELECT id, title, articleId, slug
	FROM ftsHeadings
	WHERE ftsHeadings MATCH ?
	ORDER BY bm25(ftsHeadings, 1000.0)
`,
			query
		)

		await searchForArticleHeadings.all().then(async (queryResults) => {
			for (const heading of queryResults) {
				if (BANNED_HEADINGS.some((h) => heading.slug.endsWith(h))) continue

				const article = await db.getArticle(heading.articleId)
				const section = await db.getSection(article.sectionId)
				const category = await db.getCategory(article.categoryId)
				const isUncategorized = category.id === section.id + '_ucg'

				results[searchBucket(article.sectionId)].push({
					id: article.id + '#' + heading.slug,
					type: 'heading',
					subtitle: isUncategorized ? section.title : `${section.title} / ${category.title}`,
					sectionType: sectionTypeBucket(section.id),
					title:
						section.id === 'reference'
							? article.title + '.' + heading.title
							: article.title + ': ' + heading.title,
					url: isUncategorized
						? `${section.id}/${article.id}#${heading.slug}`
						: `${section.id}/${category.id}/${article.id}#${heading.slug}`,
					score: 0,
				})
			}
		})

		Object.keys(results).forEach((section: string) => {
			results[section as keyof Data['results']] = results[section as keyof Data['results']].slice(
				0,
				20
			)
		})

		results.articles.sort(
			(a, b) => (b.type === 'heading' ? -1 : 1) - (a.type === 'heading' ? -1 : 1)
		)

		return new Response(JSON.stringify({ results, status: 'success' }), {
			status: 200,
		})
	} catch (e: any) {
		return new Response(
			JSON.stringify({
				results: structuredClone(SEARCH_RESULTS),
				status: 'error',
				error: e.message,
			}),
			{
				status: 500,
			}
		)
	}
}
