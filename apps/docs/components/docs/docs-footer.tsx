import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

export const DocsFooter: React.FC<{ article: Article }> = async ({ article }) => {
	const db = await getDb()
	const links = await db.getArticleLinks(article)

	return (
		<section className="py-10 mt-12 border-t border-zinc-100 flex justify-between gap-16">
			{links.prev ? (
				<Link
					href={links.prev.path!}
					className="group py-2 px-4 -ml-4 rounded-lg hover:bg-zinc-50 flex flex-col items-start gap-0.5"
				>
					<div className="flex items-center gap-1 text-xs group-hover:text-black">
						<ArrowLongLeftIcon className="h-3" />
						<span>Prev</span>
					</div>
					<span className="text-blue-500 group-hover:text-blue-600">{links.prev.title}</span>
				</Link>
			) : (
				<span />
			)}
			{links.next ? (
				<Link
					href={links.next.path!}
					className="group py-2 px-4 -mr-4 rounded-lg hover:bg-zinc-50 flex flex-col items-end gap-0.5"
				>
					<div className="flex items-center gap-1 text-xs group-hover:text-black">
						<span>Next</span>
						<ArrowLongRightIcon className="h-3" />
					</div>
					<span className="text-blue-500 group-hover:text-blue-600">{links.next.title}</span>
				</Link>
			) : (
				<span />
			)}
		</section>
	)
}
