import { SearchResult } from '@/types/search-types'
import { getDb } from '@/utils/ContentDatabase'
import { SEARCH_RESULTS, searchBucket, sectionTypeBucket } from '@/utils/search-api'
import { structuredClone } from '@tldraw/utils'
import assert from 'assert'
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
				status: 'error',
				error: 'No query',
			}),
			{
				status: 400,
			}
		)
	}

	try {
		const results: Data['results'] = structuredClone(SEARCH_RESULTS)
		const db = await getDb()

		const getVectorDb = (await import('@/utils/ContentVectorDatabase')).getVectorDb

		const vdb = await getVectorDb()
		const queryResults = await vdb.query(query, 25)
		queryResults.sort((a, b) => b.score - a.score)

		const headings = (
			await Promise.all(
				queryResults.map(async (result) => {
					try {
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
					} catch (e: any) {
						console.error(e.message)
						// something went wrong
						return
					}
				})
			)
		).filter(Boolean)

		const visited = new Set<string>()
		for (const result of headings) {
			if (!result) continue
			if (visited.has(result.id)) continue

			visited.add(result.id)
			const { category, section, article, heading, score } = result
			const isUncategorized = category.id === section.id + '_ucg'

			if (BANNED_HEADINGS.some((h) => heading.slug.endsWith(h))) continue

			results[searchBucket(section.id)].push({
				id: result.id,
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

			results[searchBucket(section.id)].push({
				id: article.id,
				type: 'article',
				subtitle: isUncategorized ? section.title : `${section.title} / ${category.title}`,
				sectionType: sectionTypeBucket(section.id),
				title: article.title,
				url: isUncategorized
					? `${section.id}/${article.id}`
					: `${section.id}/${category.id}/${article.id}`,
				score,
			})
		}

		Object.keys(results).forEach((section: string) => {
			const scores = results[section as keyof Data['results']].map((a) => a.score)
			const maxScore = Math.max(...scores)
			const minScore = Math.min(...scores)
			const bottomScore = minScore + (maxScore - minScore) * (section === 'apiDocs' ? 0.75 : 0.5)
			results[section as keyof Data['results']]
				.filter((a) => a.score > bottomScore)
				.sort((a, b) => b.score - a.score)
				.sort((a, b) => (b.type === 'heading' ? -1 : 1) - (a.type === 'heading' ? -1 : 1))
			results[section as keyof Data['results']] = results[section as keyof Data['results']].slice(
				0,
				10
			)
		})

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
