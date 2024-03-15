import { ArticleDocsPage } from '@/components/ArticleDocsPage'
import { getDb } from '@/utils/ContentDatabase'
import { notFound } from 'next/navigation'

export default async function HomePage() {
	const db = await getDb()
	const article = await db.db.get(`SELECT * FROM articles WHERE articles.path = ?`, `/quick-start`)
	if (article) return <ArticleDocsPage article={article} />
	throw notFound()
}
