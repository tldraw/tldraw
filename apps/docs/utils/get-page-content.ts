import { Article, Category, Section } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'

export async function getPageContent(
	path: string
): Promise<
	| { type: 'section'; section: Section }
	| { type: 'category'; category: Category }
	| { type: 'article'; article: Article }
	| undefined
> {
	const db = await getDb()

	const section = await db.db.get(`SELECT * FROM sections WHERE sections.path = ?`, path)
	if (section) return { type: 'section', section } as const

	const category = await db.db.get(`SELECT * FROM categories WHERE categories.path = ?`, path)
	if (category) return { type: 'category', category } as const

	const article = await db.db.get(`SELECT * FROM articles WHERE articles.path = ?`, path)
	if (article) return { type: 'article', article } as const

	return undefined
}
