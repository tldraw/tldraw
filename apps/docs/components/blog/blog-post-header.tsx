import { PageTitle } from '@/components/page-title'
import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { BlogBreadcrumbs } from './blog-breadcrumbs'

export const BlogPostHeader: React.FC<{ article: Article }> = async ({ article }) => {
	const db = await getDb()
	const section = await db.getSection(article.sectionId)
	const category = await db.getCategory(article.categoryId)
	return (
		<section className="pb-6 mb-6 md:mb-12 md:pb-12 border-b border-zinc-100">
			<BlogBreadcrumbs categoryId={category.id} className="mb-2" />
			<PageTitle>{article.title}</PageTitle>
			<p className="mt-4 text-zinc-800 md:text-lg max-w-2xl">{article.description}</p>
		</section>
	)
}
