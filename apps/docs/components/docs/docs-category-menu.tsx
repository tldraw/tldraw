'use client'

import { NavigationLink } from '@/components/navigation/link'
import { AcademicCapIcon, BookOpenIcon, PlayIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

const categoryLinks = [
	{
		caption: 'Learn',
		icon: AcademicCapIcon,
		href: '/quick-start',
		active: (pathname: string) =>
			['/quick-start', '/installation', '/releases', '/docs', '/community'].some((e) =>
				pathname.startsWith(e)
			),
	},
	{
		caption: 'Reference',
		icon: BookOpenIcon,
		href: '/reference/editor/Editor',
		active: (pathname: string) => pathname.startsWith('/reference'),
	},
	{
		caption: 'Examples',
		icon: PlayIcon,
		href: '/examples/basic/basic',
		active: (pathname: string) => pathname.startsWith('/examples'),
	},
]

export function DocsCategoryMenu() {
	const pathname = usePathname()
	return (
		<ul className="shrink-0 flex flex-col gap-3">
			{categoryLinks.map((item, index) => (
				<li key={index}>
					<NavigationLink {...item} active={item.active(pathname)} />
				</li>
			))}
		</ul>
	)
}
