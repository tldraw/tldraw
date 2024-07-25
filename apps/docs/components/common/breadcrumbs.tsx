import { Category, Section } from '@/types/content-types'
import { cn } from '@/utils/cn'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

export const Breadcrumbs: React.FC<{
	section?: Section
	category?: Category
	className?: string
}> = async ({ section, category, className }) => {
	const items = [section, category].filter(Boolean) as (Section | Category)[]

	return (
		<ul className={cn('flex items-center text-sm gap-2', className)}>
			{items
				.filter((item) => item.title !== 'Uncategorized')
				.map((item) => (
					<li key={item.id} className="flex items-center gap-2">
						{item.path ? <Link href={item.path}>{item.title}</Link> : <span>{item.title}</span>}
						<ChevronRightIcon className="h-4 text-zinc-300" />
					</li>
				))}
		</ul>
	)
}
