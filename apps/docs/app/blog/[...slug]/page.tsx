import { BlogCategoryPage } from '@/components/blog/blog-category-page'
import { BlogPostPage } from '@/components/blog/blog-post-page'
import { db } from '@/utils/ContentDatabase'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateMetadata({
	params,
}: {
	params: { slug: string }
}): Promise<Metadata> {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await db.getPageContent(`/blog/${path.join('/')}`)
	if (!content) notFound()

	if (content.type === 'category' && content.category.sectionId === 'blog') {
		const metadata: Metadata = { title: content.category.title }
		if (content.category.description) metadata.description = content.category.description
		return metadata
	} else if (content.type === 'article' && content.article.sectionId === 'blog') {
		const metadata: Metadata = { title: content.article.title }
		if (content.article.description) metadata.description = content.article.description
		return metadata
	}
	return {}
}

export async function generateStaticParams() {
	const paths = await db.getAllPaths()
	return paths
		.filter((path) => path.startsWith('/blog/'))
		.map((path) => ({ slug: path.slice('/blog/'.length).split('/') }))
}

export default async function Page({ params }: { params: { slug: string | string[] } }) {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await db.getPageContent(`/blog/${path.join('/')}`)

	if (!content) notFound()

	if (content.type === 'category' && content.category.sectionId === 'blog') {
		const { category } = content
		const articles = await db.getCategoryArticles(category.sectionId, category.id)
		return (
			<BlogCategoryPage
				title={category.title}
				description={category.description}
				articles={articles}
			/>
		)
	} else if (content.type === 'article' && content.article.sectionId === 'blog') {
		return <BlogPostPage article={content.article} />
	}

	notFound()
}
