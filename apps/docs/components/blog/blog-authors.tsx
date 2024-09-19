import { Article } from '@/types/content-types'
import { getAuthor } from '@/utils/get-author'
import Image from 'next/image'
import Link from 'next/link'

export function BlogAuthors({ article }: { article: Article }) {
	const authors = article.authorId.split(',').map((id: string) => getAuthor(id.trim()))

	return (
		<div className="shrink-0 mb-12">
			<h4 className="block bg-white dark:bg-zinc-950 text-black dark:text-white uppercase text-xs font-semibold">
				{authors.length > 1 ? 'Authors' : 'Author'}
			</h4>
			<ul className="mt-4 space-y-3">
				{authors.map(({ id, name, twitter, image }: any) => (
					<li key={id} className="flex items-center gap-3">
						<div className="relative size-10 rounded-full overflow-hidden">
							<Image
								src={`/avatars/${image}`}
								alt={name}
								fill
								className="object-cover object-center"
							/>
						</div>
						<div>
							<h4 className="text-black dark:text-white text-sm leading-none -mb-1">{name}</h4>
							<Link
								href={`https://twitter.com/${twitter}`}
								target="_blank"
								rel="noreferrer noopener"
								className="text-xs leading-none text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
							>
								@{twitter}
							</Link>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}
