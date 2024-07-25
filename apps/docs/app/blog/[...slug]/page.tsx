import { BlogCategoryPage } from '@/components/blog/blog-category-page'
import { BlogPostPage } from '@/components/blog/blog-post-page'
import { getDb } from '@/utils/ContentDatabase'
import { getPageContent } from '@/utils/get-page-content'
import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: { slug: string | string[] } }) {
	const db = await getDb()
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await getPageContent(`/blog/${path.join('/')}`)
	if (!content) notFound()

	if (content.type === 'category' && content.category.sectionId === 'blog') {
		const { category } = content
		const db = await getDb()
		const section = await db.getSection(content.category.sectionId)
		const articles = await db.getCategoryArticles(category.sectionId, category.id)
		return (
			<BlogCategoryPage
				title={category.title}
				description={category.description}
				section={section}
				articles={articles}
			/>
		)
	} else if (content.type === 'article' && content.article.sectionId === 'blog') {
		return <BlogPostPage article={content.article} />
	}

	notFound()
}
