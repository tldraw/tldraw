'use client'

import { NavigationLink } from '@/components/navigation/link'
import { MegaphoneIcon, RectangleStackIcon, TagIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'
import { TldrawIcon } from '../icon/tldraw'

const categoryLinks = [
	{
		caption: 'All Posts',
		icon: RectangleStackIcon,
		href: '/blog',
		active: (pathname: string) => pathname === '/blog',
	},
	{
		caption: 'Release Notes',
		icon: TagIcon,
		href: '/blog/release-notes',
		active: (pathname: string) => pathname === '/blog/release-notes',
	},
	{
		caption: 'Announcements',
		icon: MegaphoneIcon,
		href: '/blog/announcements',
		active: (pathname: string) => pathname === '/blog/announcements',
	},
	{
		caption: 'Product',
		icon: TldrawIcon,
		href: '/blog/product',
		active: (pathname: string) => pathname === '/blog/product',
	},
]

export const CategoryMenu = () => {
	const pathname = usePathname()

	return (
		<ul className="shrink-0 flex flex-col gap-3">
			{categoryLinks.map((item, index) => (
				<li key={index}>
					<NavigationLink {...item} pathname={pathname} />
				</li>
			))}
		</ul>
	)
}
