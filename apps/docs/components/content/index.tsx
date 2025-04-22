import { A } from '@/components/content/a'
import { ApiHeading } from '@/components/content/api-heading'
import { Blockquote } from '@/components/content/blockquote'
import { Callout } from '@/components/content/callout'
import { Code, CodeLinks, FocusLines } from '@/components/content/code'
import { Embed } from '@/components/content/embed'
import { Image } from '@/components/content/image'
import { ParametersTable } from '@/components/content/parameters-table'
import { ParametersTableDescription } from '@/components/content/parameters-table-description'
import { ParametersTableName } from '@/components/content/parameters-table-name'
import { ParametersTableRow } from '@/components/content/parameters-table-row'
import { Pre } from '@/components/content/pre'
import { SideBySideImages } from '@/components/content/side-by-side-images'
import { ApiMemberTitle } from '@/components/content/title-with-source-link'
import { Video } from '@/components/content/video'
import { YouTube } from '@/components/content/youtube'
import { cn } from '@/utils/cn'
import shikiRehype from '@shikijs/rehype'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug-custom-id'
import remarkGfm from 'remark-gfm'

export function Content({ mdx, type }: { mdx: string; type?: string }) {
	return (
		<section
			className={cn(
				type === 'reference' && 'prose-hr:hidden prose-h2:!mt-8 md:prose-h2:!mt-24',
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
			<MDXRemote
				source={mdx}
				components={{
					a: A,
					Embed,
					pre: Pre,
					code: Code,
					Image,
					img: Image,
					ApiHeading,
					Callout,
					FocusLines,
					CodeLinks,
					ParametersTable,
					ParametersTableDescription,
					ParametersTableName,
					ParametersTableRow,
					ApiMemberTitle,
					blockquote: Blockquote,
					Video,
					YouTube,
					TwoImages: SideBySideImages,
				}}
				options={{
					mdxOptions: {
						remarkPlugins: [remarkGfm],
						rehypePlugins: [
							[rehypeAutolinkHeadings, {}],
							[rehypeSlug, { enableCustomId: true, maintainCase: true, removeAccents: true }],
							[
								shikiRehype as any,
								{
									themes: {
										dark: 'github-dark-default',
										light: 'github-light-default',
									},
									defaultColor: false,
								},
							],
						],
						format: 'mdx',
					},
					parseFrontmatter: true,
				}}
			/>
		</section>
	)
}
