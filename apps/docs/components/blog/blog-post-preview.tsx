import { Article } from '@/types/content-types'
import { getAuthor } from '@/utils/get-author'
import { format } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'

export function BlogPostPreview({ article }: { article: Article }) {
	const authors = article.authorId.split(',').map((id: string) => getAuthor(id.trim())!)

	return (
		<Link
			href={article.path ?? `/blog/${article.categoryId}/${article.id}`}
			className="flex flex-col md:flex-row gap-x-12 gap-y-6 -mx-5 md:mx-0 items-center"
		>
			<div className="bg-zinc-100 dark:bg-zinc-800 py-1 md:rounded-2xl -mx-5 md:mx-0 md:px-1 w-full md:w-1/3 shrink-0">
				<div className="relative w-full aspect-video">
					<Image
						src={article.hero ?? ''}
						alt={article.title}
						fill
						className="object-cover object-center md:rounded-xl !my-0 shadow"
					/>
				</div>
			</div>
			<div className="px-5 md:px-0 w-full md:w-2/3">
				<h2 className="font-bold text-black dark:text-white text-2xl leading-none">
					{article.title}
				</h2>
				<p className="text-zinc-800 dark:text-zinc-200 my-4">{article.description}</p>
				<p className="text-xs text-zinc-600 dark:text-zinc-400">
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
