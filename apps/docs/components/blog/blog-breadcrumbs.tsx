import { cn } from '@/utils/cn'
import { getDb } from '@/utils/ContentDatabase'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export async function BlogBreadcrumbs({
	categoryId,
	className,
}: {
	categoryId?: string
	className?: string
}) {
	const breadcrumbs = [{ href: '/blog', caption: 'Blog' }]
	if (categoryId) {
		const db = await getDb()
		const category = await db.getCategory(categoryId)
		if (category) breadcrumbs.push({ href: `/blog/${category.id}`, caption: category.title })
	}

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
