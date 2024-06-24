import { Content } from '@/components/content'
import { Header } from '@/components/docs/header'
import { Sidebar } from '@/components/sidebar'
import { getPageContent } from '@/utils/get-page-content'
import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: { slug: string | string[] } }) {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await getPageContent(`/${path.join('/')}`)
	if (!content || content.type !== 'article') notFound()

	return (
		<div className="w-full max-w-screen-xl mx-auto px-5 flex pt-16">
			<Sidebar
				sectionId={content.article.sectionId}
				categoryId={content.article.categoryId}
				articleId={content.article.id}
			/>
			<main className="max-w-3xl px-5 lg:px-12">
				<Header article={content.article} />
				<Content mdx={content.article.content ?? ''} />
			</main>
		</div>
	)
}
