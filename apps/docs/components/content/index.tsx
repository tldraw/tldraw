import { cn } from '@/utils/cn'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug-custom-id'
import remarkGfm from 'remark-gfm'
import { ApiHeading } from './api-heading'
import { CodeLinkProvider } from './code-link-provider'
import { Embed } from './embed'
import { Image } from './image'
import { ParametersTable } from './parameters-table'
import { ParametersTableDescription } from './parameters-table-description'
import { ParametersTableName } from './parameters-table-name'
import { ParametersTableRow } from './parameters-table-row'
import { Pre } from './pre'
import { TitleWithSourceLink } from './title-with-source-link'

export const Content: React.FC<{ mdx: string; type?: string }> = ({ mdx, type }) => {
	return (
		<section
			className={cn(
				type === 'reference' && 'prose-hr:hidden prose-h2:!mt-8 md:prose-h2:!mt-24',
				'prose prose-sm prose-zinc text-zinc-800 sm:prose-base w-full max-w-3xl',
				'prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-normal',
				'prose-a:no-underline prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-a:font-normal',
				'prose-blockquote:text-zinc-800 prose-blockquote:font-normal prose-blockquote:border-none prose-blockquote:px-4 prose-blockquote:leading-normal prose-blockquote:bg-zinc-50 prose-blockquote:py-3 prose-blockquote:rounded-xl',
				'prose-table:bg-zinc-50 prose-table:rounded-xl prose-table:text-sm',
				'prose-th:text-left prose-th:font-semibold prose-th:uppercase prose-th:text-xs prose-th:border-l prose-th:border-white prose-th:py-3 prose-th:px-4',
				'prose-tr:border-t prose-tr:border-white',
				'prose-td:border-l first:prose-td:border-l-0 prose-td:border-white prose-td:py-3 prose-td:px-4',
				'prose-hr:border-zinc-100'
			)}
		>
			<MDXRemote
				source={mdx}
				components={{
					Embed,
					pre: Pre,
					Image,
					ApiHeading,
					CodeLinkProvider,
					ParametersTable,
					ParametersTableDescription,
					ParametersTableName,
					ParametersTableRow,
					TitleWithSourceLink,
				}}
				options={{
					mdxOptions: {
						remarkPlugins: [remarkGfm, {}],
						rehypePlugins: [
							[rehypeHighlight as any, {}],
							[rehypeAutolinkHeadings, {}],
							[rehypeSlug, { enableCustomId: true, maintainCase: true, removeAccents: true }],
						],
						format: 'mdx',
					},
					parseFrontmatter: true,
				}}
			/>
		</section>
	)
}
