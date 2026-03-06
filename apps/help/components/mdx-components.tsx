import type { MDXComponents } from 'mdx/types'
import Image from 'next/image'
import Link from 'next/link'

export const mdxComponents: MDXComponents = {
	img: ({ src, alt, width, height }) => {
		if (!src) return null
		return (
			<Image
				src={src}
				alt={alt ?? ''}
				width={typeof width === 'number' ? width : 800}
				height={typeof height === 'number' ? height : 450}
				unoptimized
				className="rounded-lg"
			/>
		)
	},
	a: ({ href, children }) => {
		if (!href) return <span>{children}</span>
		const isExternal = href.startsWith('http')
		if (isExternal) {
			return (
				<a href={href} target="_blank" rel="noopener noreferrer">
					{children}
				</a>
			)
		}
		return <Link href={href}>{children}</Link>
	},
}
