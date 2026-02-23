import { mdxComponents } from '@/components/mdx-components'
import { Sidebar } from '@/components/sidebar'
import { getAllGuides, getGuide } from '@/lib/content'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote-client/rsc'
import { notFound } from 'next/navigation'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

export async function generateStaticParams() {
	const guides = getAllGuides()
	return guides.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata(props: {
	params: Promise<{ slug: string }>
}): Promise<Metadata> {
	const { slug } = await props.params
	const guide = getGuide(slug)
	if (!guide) return {}
	return { title: guide.title }
}

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
	const { slug } = await props.params
	const guide = getGuide(slug)
	if (!guide) notFound()

	const guides = getAllGuides()

	return (
		<div className="w-full max-w-screen-2xl mx-auto md:px-5 md:flex md:items-start md:pt-12">
			<Sidebar guides={guides} />
			<main className="grow px-5 pt-12 lg:pl-12 pb-16 min-w-0">
				<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">{guide.title}</h1>
				<div
					className={[
						'prose dark:prose-invert prose-sm prose-zinc sm:prose-base w-full max-w-full',
						'prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-100 dark:prose-code:!bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-normal',
						'prose-a:no-underline prose-a:text-blue-500 hover:prose-a:text-blue-600 dark:hover:prose-a:text-blue-400 prose-a:font-normal',
						'prose-blockquote:text-zinc-800 dark:prose-blockquote:text-zinc-200 prose-blockquote:font-normal prose-blockquote:border-none prose-blockquote:px-4 prose-blockquote:leading-normal prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-900 prose-blockquote:py-3 prose-blockquote:rounded-xl',
						'prose-table:text-sm',
						'prose-thead:border-b-2 prose-thead:border-zinc-200 dark:prose-thead:border-zinc-700',
						'prose-th:py-2 prose-th:pr-8 prose-th:font-semibold prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:text-zinc-500 dark:prose-th:text-zinc-400',
						'prose-tr:border-b prose-tr:border-zinc-100 dark:prose-tr:border-zinc-800',
						'prose-td:py-2 prose-td:pr-8',
						'prose-hr:border-zinc-100 dark:prose-hr:border-zinc-800',
						'prose-h1:scroll-mt-20 prose-h2:scroll-mt-20 prose-h3:scroll-mt-20 prose-h4:scroll-mt-20',
					].join(' ')}
				>
					<MDXRemote
						source={guide.content}
						components={mdxComponents}
						options={{
							mdxOptions: {
								remarkPlugins: [remarkGfm],
								rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
							},
						}}
					/>
				</div>
			</main>
		</div>
	)
}
