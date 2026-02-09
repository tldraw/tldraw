import { urlFor } from '@/sanity/image'
import type { PortableTextBlock } from '@portabletext/react'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import Image from 'next/image'

const components: PortableTextComponents = {
	types: {
		image: ({ value }: { value: { asset: { _ref: string }; alt?: string; caption?: string } }) => {
			return (
				<figure className="my-8">
					<Image
						src={urlFor(value).width(1200).url()}
						alt={value.alt || ''}
						width={1200}
						height={675}
						className="rounded-lg"
					/>
					{value.caption && (
						<figcaption className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
							{value.caption}
						</figcaption>
					)}
				</figure>
			)
		},
		code: ({ value }: { value: { code: string; language?: string } }) => {
			return (
				<pre className="my-6 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm dark:bg-zinc-800">
					<code className={value.language ? `language-${value.language}` : ''}>{value.code}</code>
				</pre>
			)
		},
		callout: ({ value }: { value: { text: string; tone?: string } }) => {
			return (
				<div className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30">
					<p className="text-sm text-blue-800 dark:text-blue-200">{value.text}</p>
				</div>
			)
		},
		youtube: ({ value }: { value: { url: string } }) => {
			const videoId = value.url.match(
				/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/
			)?.[1]
			if (!videoId) return null
			return (
				<div className="my-8 aspect-video overflow-hidden rounded-lg">
					<iframe
						src={`https://www.youtube.com/embed/${videoId}`}
						title="YouTube video"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						className="h-full w-full"
					/>
				</div>
			)
		},
	},
	marks: {
		link: ({ children, value }: { children: React.ReactNode; value?: { href: string } }) => {
			const href = value?.href || ''
			const isExternal = href.startsWith('http')
			return (
				<a
					href={href}
					className="text-blue-600 underline decoration-blue-600/30 transition-colors hover:text-blue-500 dark:text-blue-400"
					{...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
				>
					{children}
				</a>
			)
		},
		code: ({ children }: { children: React.ReactNode }) => {
			return (
				<code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
					{children}
				</code>
			)
		},
	},
}

interface RichTextProps {
	value: PortableTextBlock[]
}

export function RichText({ value }: RichTextProps) {
	return (
		<div className="prose prose-zinc max-w-none dark:prose-invert">
			<PortableText value={value} components={components} />
		</div>
	)
}
