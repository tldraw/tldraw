'use client'

import { NavigationLink } from '@/components/navigation/link'
import { RocketLaunchIcon } from '@heroicons/react/16/solid'
import { AcademicCapIcon, CommandLineIcon, PlayIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

const categoryLinks = [
	{
		caption: 'Quick Start',
		icon: RocketLaunchIcon,
		href: '/quick-start',
		active: (pathname: string) =>
			['/quick-start', '/installation', '/releases'].some((e) => pathname.startsWith(e)),
	},
	{
		caption: 'Guides',
		icon: AcademicCapIcon,
		href: '/editor',
		active: (pathname: string) => ['/docs', '/community'].some((e) => pathname.startsWith(e)),
	},
	{
		caption: 'Reference',
		icon: CommandLineIcon,
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
		<ul className="flex flex-col gap-3 shrink-0">
			{categoryLinks.map((item, index) => (
				<li key={index}>
					<NavigationLink {...item} active={item.active(pathname)} />
				</li>
			))}
		</ul>
	)
}
