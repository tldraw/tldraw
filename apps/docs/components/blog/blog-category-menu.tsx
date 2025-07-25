'use client'

import { TldrawIcon } from '@/components/common/icon/tldraw'
import { NavigationLink } from '@/components/navigation/link'
import { Category } from '@/types/content-types'
import { FlagIcon, MegaphoneIcon, RectangleStackIcon, TagIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

const icons = {
	'all-posts': RectangleStackIcon,
	announcements: MegaphoneIcon,
	'case-studies': FlagIcon,
	product: TldrawIcon,
	'release-notes': TagIcon,
}

export function BlogCategoryMenu({ categories }: { categories: Category[] }) {
	const pathname = usePathname()

	return (
		<ul className="shrink-0 flex flex-col gap-3">
			<li>
				<NavigationLink
					caption={'All posts'}
					icon={RectangleStackIcon}
					href={'/blog'}
					active={pathname === `/blog`}
				/>
			</li>

			{categories.map((item, index) => (
				<li key={index}>
					<NavigationLink
						caption={item.title}
						icon={icons[item.id as keyof typeof icons]}
						href={item.path ?? ''}
						active={pathname.startsWith(`/blog/${item.id}`)}
					/>
				</li>
			))}
		</ul>
	)
}
