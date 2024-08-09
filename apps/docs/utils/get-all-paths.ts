import { getDb } from './ContentDatabase'

export const getAllPaths = async () => {
	const db = await getDb()
	const articles = await db.db.all(`SELECT path FROM articles`)
	return articles.map((article) => article.path)
}
