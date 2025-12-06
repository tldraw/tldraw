import { Content } from '@/components/content'
import { Example } from '@/components/content/example'
import { DocsFeedbackWidget } from '@/components/docs/docs-feedback-widget'
import { DocsFooter } from '@/components/docs/docs-footer'
import { DocsHeader } from '@/components/docs/docs-header'
import { DocsMobileSidebar } from '@/components/docs/docs-mobile-sidebar'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { DocsTableOfContents } from '@/components/docs/docs-table-of-contents'
import { SearchButton } from '@/components/search/SearchButton'
import { db } from '@/utils/ContentDatabase'
import { parseMarkdown } from '@/utils/parse-markdown'
import { Metadata } from 'next'
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
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-8 isolate">
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
					<Content mdx={content.article.content ?? ''} type={content.article.sectionId} />
					<Example article={content.article} />
					<div className="mx-auto w-full max-w-sm">
						<DocsFeedbackWidget className="mb-12" />
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
					<main className="relative w-full max-w-3xl px-5 pt-12 shrink md:pr-0 lg:pl-12 xl:pr-12 md:pt-0 min-w-[1px]">
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
