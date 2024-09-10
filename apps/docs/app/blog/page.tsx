import { BlogCategoryPage } from '@/components/blog/blog-category-page'
import { getDb } from '@/utils/ContentDatabase'
import { getPageContent } from '@/utils/get-page-content'
import { notFound } from 'next/navigation'

export default async function Page() {
	const content = await getPageContent('/blog')
	if (!content || content.type !== 'section') notFound()
	const { section } = content
	const db = await getDb()
	const categories = await db.getCategoriesForSection('blog')
	const categoriesWithArticles = await Promise.allSettled(
		categories.map(async (category) => {
			const articles = await db.getCategoryArticles(section.id, category.id)
			return { category, articles }
		})
	)
	// @ts-ignore
	const articles = categoriesWithArticles.map(({ value: { articles } }) => articles).flat()

	return (
		<BlogCategoryPage title="All Posts" description={section.description} articles={articles} />
	)
}
