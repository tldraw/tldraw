import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug-custom-id'
import remarkGfm from 'remark-gfm'
import { Embed } from './embed'

export const Content: React.FC<{ mdx: string }> = ({ mdx }) => {
	return (
		<section className="prose max-w-3xl">
			<MDXRemote
				source={mdx}
				components={{ Embed }}
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
