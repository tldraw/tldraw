import { getDb } from './ContentDatabase'

export async function getAllPaths() {
	const db = await getDb()
	const articles = await db.db.all(`SELECT path FROM articles`)
	return articles.map((article) => article.path)
}
