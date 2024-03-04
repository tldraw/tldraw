import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug-custom-id'
import { components } from './mdx-components'

interface MdxProps {
	content: string
}

export function Mdx({ content }: MdxProps) {
	return (
		<MDXRemote
			source={content}
			components={components}
			options={{
				mdxOptions: {
					// remarkPlugins: [remarkGfm, {}],
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
	)
}
