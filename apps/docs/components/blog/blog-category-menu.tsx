'use client'

import { NavigationLink } from '@/components/navigation/link'
import { Category } from '@/types/content-types'
import { MegaphoneIcon, RectangleStackIcon, TagIcon } from '@heroicons/react/20/solid'
import { TldrawIcon } from '../icon/tldraw'

const ICONS = {
	announcements: MegaphoneIcon,
	'release-notes': TagIcon,
	product: TldrawIcon,
	'all-posts': RectangleStackIcon,
}

export const BlogCategoryMenu = ({ categories }: { categories: Category[] }) => {
	const pathname = window.location.pathname
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
						icon={ICONS[item.id as keyof typeof ICONS]}
						href={item.path ?? ''}
						active={pathname.startsWith(`/blog/${item.id}`)}
					/>
				</li>
			))}
		</ul>
	)
}
