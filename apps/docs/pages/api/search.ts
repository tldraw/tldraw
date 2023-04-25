// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { SearchResult } from '@/types/search-types'
import { getArticles, getSections } from '@/utils/content'
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
	results: SearchResult[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
	const { q, s } = req.query
	const query = q?.toString().toLowerCase()
	const activeId = s?.toString()

	if (!query) return res.status(400).json({ results: [] })

	const results: Data['results'] = []
	const articles = await getArticles()

	for (const section of await getSections()) {
		for (const category of section.categories) {
			for (const articleId of category.articleIds) {
				if (activeId === articleId) continue

				const article = articles[articleId]
				if (
					article.title.toLowerCase().includes(query) ||
					(article.description && article.description.toLowerCase().includes(query)) ||
					article.keywords.includes(query)
				) {
					results.push({
						id: article.id,
						type: 'article',
						subtitle:
							category.id === 'ucg' ? `${section.title}` : `${section.title} / ${category.title}`,
						title: article.title,
						url: `${section.id}/${category.id}/${article.id}`,
					})
				}
			}
		}
	}

	res.status(200).json({ results })
}
