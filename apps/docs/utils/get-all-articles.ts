import { getDb } from './ContentDatabase'

export const getAllArticles = async () => {
	const db = await getDb()
	const docs = await db.db.all(`SELECT * FROM articles WHERE articles.sectionId != 'blog'`)
	const blog = await db.db.all(`SELECT * FROM articles WHERE articles.sectionId = 'blog'`)
	return { blog, docs }
}
