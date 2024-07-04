import { Content } from '@/components/content'
import { Footer } from '@/components/docs/footer'
import { Header } from '@/components/docs/header'
import { TableOfContents } from '@/components/docs/table-of-contents'
import { MobileSidebar } from '@/components/navigation/mobile-sidebar'
import { SearchButton } from '@/components/search/button'
import { Sidebar } from '@/components/sidebar'
import { getPageContent } from '@/utils/get-page-content'
import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: { slug: string | string[] } }) {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await getPageContent(`/${path.join('/')}`)
	if (!content || content.type !== 'article') notFound()

	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16">
			<Sidebar
				sectionId={content.article.sectionId}
				categoryId={content.article.categoryId}
				articleId={content.article.id}
			/>
			<div className="fixed w-full h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white/90 backdrop-blur md:hidden">
				<MobileSidebar
					sectionId={content.article.sectionId}
					categoryId={content.article.categoryId}
					articleId={content.article.id}
				/>
				<SearchButton type="docs" layout="mobile" className="hidden sm:block -mr-2" />
			</div>
			<main className="relative shrink overflow-x-hidden max-w-3xl pl-5 lg:pl-12 xl:pr-12 pt-24 md:pt-0">
				<Header article={content.article} />
				<Content mdx={content.article.content ?? ''} />
				<Footer article={content.article} />
			</main>
			<TableOfContents article={content.article} />
		</div>
	)
}
