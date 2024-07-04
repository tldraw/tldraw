import { cn } from '@/utils/cn'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug-custom-id'
import remarkGfm from 'remark-gfm'
import { Embed } from './embed'
import { Image } from './image'
import { Pre } from './pre'

export const Content: React.FC<{ mdx: string }> = ({ mdx }) => {
	return (
		<section
			className={cn(
				'prose prose-sm prose-zinc text-zinc-800 sm:prose-base w-full max-w-3xl',
				'prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
				'prose-a:no-underline prose-a:text-blue-500 hover:prose-a:text-blue-600',
				'prose-blockquote:text-zinc-800 prose-blockquote:font-normal prose-blockquote:border-none prose-blockquote:px-4 prose-blockquote:leading-normal prose-blockquote:bg-zinc-50 prose-blockquote:py-3 prose-blockquote:rounded-xl md:prose-blockquote:mx-1'
			)}
		>
			<MDXRemote
				source={mdx}
				components={{ Embed, pre: Pre, Image }}
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
