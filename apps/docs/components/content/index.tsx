import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug-custom-id'
import remarkGfm from 'remark-gfm'
import { Embed } from './embed'
import { Pre } from './pre'

export const Content: React.FC<{ mdx: string }> = ({ mdx }) => {
	return (
		<section className="prose prose-sm prose-zinc text-zinc-800 sm:prose-base w-full max-w-3xl prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:no-underline prose-a:text-blue-500">
			<MDXRemote
				source={mdx}
				components={{ Embed, pre: Pre }}
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
