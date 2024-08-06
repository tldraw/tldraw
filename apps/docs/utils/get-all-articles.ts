import { getDb } from './ContentDatabase'

export const getAllArticles = async () => {
	const db = await getDb()

	const articles = await db.db.all(
		`SELECT title, description, path, id, sectionId, sectionIndex AS articleIndex,
		(SELECT title FROM sections WHERE sections.id = articles.sectionId) AS section,
		(SELECT title FROM categories WHERE categories.id = articles.categoryId) AS category 
		FROM articles`
	)
	const articlesWithHeadings = await Promise.all(
		articles.map(async (article) => {
			const headings = await db.getArticleHeadings(article.id)
			return {
				...article,
				joinedHeadings: headings.map(({ title }) => title).join(' | '),
			}
		})
	)

	return {
		docs: articlesWithHeadings.filter((article) => article.sectionId !== 'blog'),
		blog: articlesWithHeadings.filter((article) => article.sectionId === 'blog'),
	}
}
