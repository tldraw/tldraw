import { Content } from '@/components/content'
import { Example } from '@/components/content/example'
import { DocsFeedbackWidget } from '@/components/docs/docs-feedback-widget'
import { DocsFooter } from '@/components/docs/docs-footer'
import { DocsHeader } from '@/components/docs/docs-header'
import { DocsMobileSidebar } from '@/components/docs/docs-mobile-sidebar'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { DocsTableOfContents } from '@/components/docs/docs-table-of-contents'
import { SearchButton } from '@/components/search/button'
import { getPageContent } from '@/utils/get-page-content'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateMetadata({
	params,
}: {
	params: { slug: string | string[] }
}): Promise<Metadata> {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await getPageContent(`/${path.join('/')}`)
	if (!content || content.type !== 'article') notFound()
	const metadata: Metadata = { title: content.article.title }
	if (content.article.description) metadata.description = content.article.description
	return metadata
}

export default async function Page({ params }: { params: { slug: string | string[] } }) {
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await getPageContent(`/${path.join('/')}`)
	if (!content || content.type !== 'article') notFound()

	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-8 isolate">
			<DocsSidebar
				sectionId={content.article.sectionId}
				categoryId={content.article.categoryId}
				articleId={content.article.id}
			/>
			<div className="fixed z-10 flex items-center justify-between w-full h-12 px-5 bg-white border-b border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 backdrop-blur md:hidden">
				<DocsMobileSidebar
					sectionId={content.article.sectionId}
					categoryId={content.article.categoryId}
					articleId={content.article.id}
				/>
				<SearchButton type="docs" layout="mobile" className="hidden -mr-2 sm:block" />
			</div>
			{content.article.sectionId === 'examples' ? (
				<>
					<main className="relative w-full px-5 pt-24 shrink md:pt-0 min-w-[1px]">
						<DocsHeader article={content.article} />
						<Content mdx={content.article.content ?? ''} type={content.article.sectionId} />
						<Example article={content.article} />
						<div className="w-full max-w-sm">
							<DocsFeedbackWidget className="mb-12" />
						</div>
						<DocsFooter article={content.article} />
					</main>
				</>
			) : (
				<>
					<main className="relative w-full max-w-3xl px-5 pt-24 shrink md:pr-0 lg:pl-12 xl:pr-12 md:pt-0 min-w-[1px]">
						<DocsHeader article={content.article} />
						<Content mdx={content.article.content ?? ''} type={content.article.sectionId} />
						<DocsFooter article={content.article} />
					</main>
					<DocsTableOfContents article={content.article} />
				</>
			)}
		</div>
	)
}
