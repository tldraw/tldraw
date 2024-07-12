import { cn } from '@/utils/cn'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { allCategories } from 'contentlayer/generated'
import Link from 'next/link'

export const Breadcrumbs: React.FC<{ categorySlug?: string; className?: string }> = ({
	categorySlug,
	className,
}) => {
	const breadcrumbs = [{ href: '/blog', caption: 'Blog' }]
	if (categorySlug) {
		const category = allCategories.find((category) => category.slug === categorySlug)
		if (category) breadcrumbs.push({ href: `/blog/${category.slug}`, caption: category.name })
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
