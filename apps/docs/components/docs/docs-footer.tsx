import { Article } from '@/types/content-types'
import { db } from '@/utils/ContentDatabase'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

export async function DocsFooter({ article }: { article: Article }) {
	const links = await db.getArticleLinks(article)

	return (
		<section className="py-10 mt-12 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap justify-between gap-8">
			{links.prev ? (
				<Link
					href={links.prev.path!}
					className="group py-2 px-4 -ml-4 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 flex flex-col items-start gap-0.5"
				>
					<div className="flex items-center gap-1 text-xs group-hover:text-black dark:group-hover:text-white">
						<ArrowLongLeftIcon className="h-3" />
						<span>Prev</span>
					</div>
					<span className="text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">
						{links.prev.title}
					</span>
				</Link>
			) : (
				<span />
			)}
			{links.next ? (
				<Link
					href={links.next.path!}
					className="group py-2 px-4 -mr-4 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 flex flex-col items-end gap-0.5 justify-self-end ml-auto"
				>
					<div className="flex items-center gap-1 text-xs group-hover:text-black dark:group-hover:text-white">
						<span>Next</span>
						<ArrowLongRightIcon className="h-3" />
					</div>
					<span className="text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">
						{links.next.title}
					</span>
				</Link>
			) : (
				<span />
			)}
		</section>
	)
}
