import { Article } from '@/types/content-types'
import { format } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

export const BlogPostPreview: React.FC<{ post: Article }> = ({ post }) => {
	return (
		<Link href={`/blog/${post.categoryId}/${post.id}`} className="flex gap-x-12 items-center">
			<div className="bg-zinc-100 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1 md:w-1/3 shrink-0">
				<div className="relative w-full aspect-video">
					<Image
						src={post.hero ?? ''}
						alt={post.title}
						fill
						className="object-cover object-center rounded-xl !my-0 shadow"
					/>
				</div>
			</div>
			<div>
				<h2 className="font-bold text-black text-2xl leading-none">{post.title}</h2>
				<p className="text-zinc-800 my-4">{post.description}</p>
				<p className="text-xs text-zinc-600">
					<span>{format(new Date(post.date ?? new Date()), 'MMMM dd, yyyy')}</span>
					<span>{' · '}</span>
					{/* {post.authors.map((slug, index) => {
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
					})} */}
				</p>
			</div>
		</Link>
	)
}
