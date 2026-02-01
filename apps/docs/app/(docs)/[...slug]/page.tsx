import { Content } from '@/components/content'
import { StarterKitEmbed } from '@/components/content/embed'
import { Example } from '@/components/content/example'
import { DocsFeedbackWidget } from '@/components/docs/docs-feedback-widget'
import { DocsFooter } from '@/components/docs/docs-footer'
import { DocsHeader } from '@/components/docs/docs-header'
import { DocsMobileSidebar } from '@/components/docs/docs-mobile-sidebar'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { DocsStarterSidebar } from '@/components/docs/docs-starter-sidebar'
import { DocsTableOfContents } from '@/components/docs/docs-table-of-contents'
import { SearchButton } from '@/components/search/SearchButton'
import { db } from '@/utils/ContentDatabase'
import { cn } from '@/utils/cn'
import { parseMarkdown } from '@/utils/parse-markdown'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export async function generateMetadata(props: {
	params: Promise<{ slug: string | string[] }>
}): Promise<Metadata> {
	const params = await props.params
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await db.getPageContent(`/${path.join('/')}`)
	if (!content || content.type !== 'article') notFound()
	const metadata: Metadata = { title: content.article.title }
	if (content.article.description) {
		metadata.description = content.article.description
	} else {
		const parsed = parseMarkdown(content.article.content ?? '', content.article.id)
		const initialContentText = parsed.initialContentText.trim()
		if (initialContentText) metadata.description = initialContentText
	}
	return metadata
}
const nonDocsPaths = ['/blog/', '/legal/']
export async function generateStaticParams() {
	const paths = await db.getAllPaths()
	return paths
		.filter((path) => !nonDocsPaths.some((nonDocsPath) => path.startsWith(nonDocsPath)))
		.map((path) => ({ slug: path.slice(1).split('/') }))
}

export default async function Page(props: { params: Promise<{ slug: string | string[] }> }) {
	const params = await props.params
	const path = typeof params.slug === 'string' ? [params.slug] : params.slug
	const content = await db.getPageContent(`/${path.join('/')}`)
	if (!content || content.type !== 'article') notFound()

	return (
		<div className="w-full max-w-screen-2xl mx-auto md:px-5 md:flex md:items-start md:pt-12 isolate">
			<DocsSidebar
				sectionId={content.article.sectionId}
				categoryId={content.article.categoryId}
				articleId={content.article.id}
			/>
			<div className="sticky top-14 z-10 flex items-center justify-between w-full h-12 px-5 bg-white border-b border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 backdrop-blur md:hidden">
				<DocsMobileSidebar
					sectionId={content.article.sectionId}
					categoryId={content.article.categoryId}
					articleId={content.article.id}
				/>
				<SearchButton type="docs" layout="mobile" className="hidden -mr-2 sm:block" />
			</div>
			{content.article.sectionId === 'examples' ? (
				<main className="relative w-full px-5 pt-12 shrink md:pt-0 min-w-[1px]">
					<DocsHeader article={content.article} />
					{content.article.description && (
						<Content mdx={content.article.description} type={content.article.sectionId} />
					)}
					<Example article={content.article} />
					{content.article.content && (
						<Content mdx={content.article.content} type={content.article.sectionId} />
					)}
					<div className="mx-auto w-full max-w-sm mt-8 mb-16">
						<DocsFeedbackWidget />
					</div>
					<DocsFooter article={content.article} />
				</main>
			) : content.article.sectionId === 'starter-kits' &&
			  content.article.id !== 'starter-kits/starter-kits_ucg/overview' ? (
				<main className="relative w-full px-5 pt-12 shrink md:pt-0 min-w-[1px]">
					<DocsHeader article={content.article} />
					<div
						className={cn(
							'mb-8',
							'prose dark:prose-invert prose-sm prose-zinc text-zinc-800 dark:text-zinc-200 sm:prose-base w-full max-w-full',
							'prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-100 dark:prose-code:!bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-normal',
							'prose-a:no-underline prose-a:text-blue-500 hover:prose-a:text-blue-600 dark:hover:prose-a:text-blue-400 prose-a:font-normal',
							'prose-blockquote:text-zinc-800 dark:prose-blockquote:text-zinc-200 prose-blockquote:font-normal prose-blockquote:border-none prose-blockquote:px-4 prose-blockquote:leading-normal prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-900 prose-blockquote:py-3 prose-blockquote:rounded-xl',
							'prose-table:bg-zinc-50 dark:prose-table:bg-zinc-900 prose-table:rounded-xl prose-table:text-sm',
							'prose-th:text-left prose-th:font-semibold prose-th:uppercase prose-th:text-xs prose-th:border-l prose-th:border-white dark:prose-th:border-zinc-950 prose-th:py-3 prose-th:px-4',
							'prose-tr:border-t prose-tr:border-white dark:prose-tr:border-zinc-950',
							'prose-td:border-l first:prose-td:border-l-0 prose-td:border-white dark:prose-td:border-zinc-950 prose-td:py-3 prose-td:px-4',
							'prose-hr:border-zinc-100 dark:prose-hr:border-zinc-800',
							'prose-h1:scroll-mt-20 prose-h2:scroll-mt-20 prose-h3:scroll-mt-20 prose-h4:scroll-mt-20 prose-h5:scroll-mt-20'
						)}
					>
						<p>{content.article.description}</p>
						<StarterKitEmbed id={content.article.embed ?? content.article.id} />
					</div>
					<div className="flex flex-col xl:flex-row gap-6 relative">
						<DocsStarterSidebar article={content.article} />
						<Content mdx={content.article.content ?? ''} type={content.article.sectionId} />
					</div>
					<DocsFooter article={content.article} />
				</main>
			) : content.article.sectionId === 'starter-kits' ? (
				<main className="relative w-full px-5 pt-12 shrink md:pt-0 min-w-[1px]">
					<DocsHeader article={content.article} />
					<Content mdx={content.article.content ?? ''} type={content.article.sectionId} />
					<DocsFooter article={content.article} />
					<div className="mx-auto w-full max-w-sm mt-8 mb-16">
						<DocsFeedbackWidget />
					</div>
				</main>
			) : (
				<>
					<main className="relative grow  px-5 pt-12 md:pr-0 lg:pl-12 xl:pr-12 md:pt-0 min-w-[1px]">
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
