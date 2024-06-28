import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { cn } from '@/utils/cn'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

export const Breadcrumbs: React.FC<{ article: Article; className?: string }> = async ({
	article,
	className,
}) => {
	const db = await getDb()
	const section = await db.getSection(article.sectionId)
	const category = await db.getCategory(article.categoryId)

	const breadcrumbs = [
		category.title === 'Uncategorized' ? { href: '/quick-start', caption: 'Learn' } : undefined,
		{ href: section.path, caption: section.title },
		category.title !== 'Uncategorized'
			? { href: category.path, caption: category.title }
			: undefined,
		article.groupId ? { caption: article.groupId } : undefined,
	]

	return (
		<ul className={cn('flex items-center text-sm gap-2', className)}>
			{breadcrumbs.map(
				(element, index) =>
					element && (
						<li key={index} className="flex items-center gap-2">
							{element.href ? (
								<Link href={element.href}>{element.caption}</Link>
							) : (
								<span>{element.caption}</span>
							)}
							<ChevronRightIcon className="h-4 text-zinc-300" />
						</li>
					)
			)}
		</ul>
	)
}
