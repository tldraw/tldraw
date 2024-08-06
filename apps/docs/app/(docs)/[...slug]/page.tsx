import { Content } from '@/components/content'
import { Example } from '@/components/content/example'
import { DocsFooter } from '@/components/docs/docs-footer'
import { DocsHeader } from '@/components/docs/docs-header'
import { DocsMobileSidebar } from '@/components/docs/docs-mobile-sidebar'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { DocsTableOfContents } from '@/components/docs/docs-table-of-contents'
import { SearchButton } from '@/components/search/button'
import { getPageContent } from '@/utils/get-page-content'
import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: { slug: string | string[] } }) {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await getPageContent(`/${path.join('/')}`)
	if (!content || content.type !== 'article') notFound()

	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<DocsSidebar
				sectionId={content.article.sectionId}
				categoryId={content.article.categoryId}
				articleId={content.article.id}
			/>
			<div className="fixed w-full h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white/90 backdrop-blur md:hidden z-10">
				<DocsMobileSidebar
					sectionId={content.article.sectionId}
					categoryId={content.article.categoryId}
					articleId={content.article.id}
				/>
				<SearchButton type="docs" layout="mobile" className="hidden sm:block -mr-2" />
			</div>
			<main className="relative shrink w-full max-w-3xl px-5 md:pr-0 lg:pl-12 xl:pr-12 pt-24 md:pt-0">
				<DocsHeader article={content.article} />
				<Content mdx={content.article.content ?? ''} type={content.article.sectionId} />
				{content.article.sectionId === 'examples' && <Example article={content.article} />}
				<DocsFooter article={content.article} />
			</main>
			<DocsTableOfContents article={content.article} />
		</div>
	)
}
