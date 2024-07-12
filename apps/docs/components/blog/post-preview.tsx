import { allAuthors, Post } from 'contentlayer/generated'
import { format } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

export const PostPreview: React.FC<{ post: Post }> = ({ post }) => {
	return (
		<Link href={`/blog/${post.category}/${post.slug}`} className="flex gap-x-12 items-center">
			<div className="bg-zinc-100 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1 md:w-1/3 shrink-0">
				<div className="relative w-full aspect-video">
					<Image
						src={post.thumbnail}
						alt={post.title}
						fill
						className="object-cover object-center rounded-xl !my-0 shadow"
					/>
				</div>
			</div>
			<div>
				<h2 className="font-bold text-black text-2xl leading-none">{post.title}</h2>
				<p className="text-zinc-800 my-4">{post.excerpt}</p>
				<p className="text-xs text-zinc-600">
					<span>{format(new Date(post.date), 'MMMM dd, yyyy')}</span>
					<span>{' · '}</span>
					{post.authors.map((slug, index) => {
						const author = allAuthors.find((author) => author.slug === slug)
						if (!author) return null
						return (
							<span key={index}>
								{author.name}
								{index === post.authors.length - 2
									? ' & '
									: index === post.authors.length - 1
										? ''
										: ', '}
							</span>
						)
					})}
				</p>
			</div>
		</Link>
	)
}
