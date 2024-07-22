import { getAuthor } from '@/utils/get-author'
import { format } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

export const BlogPostPreview: React.FC<{ article: any }> = ({ article }) => {
	const authors = article.authorId.split(',').map((id: string) => getAuthor(id.trim()))

	return (
		<Link
			href={article.path ?? `/blog/${article.categoryId}/${article.id}`}
			className="flex gap-x-12 items-center"
		>
			<div className="bg-zinc-100 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1 md:w-1/3 shrink-0">
				<div className="relative w-full aspect-video">
					<Image
						src={article.hero ?? ''}
						alt={article.title}
						fill
						className="object-cover object-center rounded-xl !my-0 shadow"
					/>
				</div>
			</div>
			<div>
				<h2 className="font-bold text-black text-2xl leading-none">{article.title}</h2>
				<p className="text-zinc-800 my-4">{article.description}</p>
				<p className="text-xs text-zinc-600">
					<span>{format(new Date(article.date ?? new Date()), 'MMMM dd, yyyy')}</span>
					{authors.length > 0 && <span>{' · '}</span>}
					{authors.map(({ name }: { name: string }, index: number) => {
						return (
							<span key={index}>
								{name}
								{index === authors.length - 2 ? ' & ' : index === authors.length - 1 ? '' : ', '}
							</span>
						)
					})}
				</p>
			</div>
		</Link>
	)
}
