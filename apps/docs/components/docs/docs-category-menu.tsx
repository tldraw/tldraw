'use client'

import { NavigationLink } from '@/components/navigation/link'
import { RocketLaunchIcon } from '@heroicons/react/16/solid'
import { AcademicCapIcon, CommandLineIcon, CubeIcon, PlayIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

const categoryLinks = [
	{
		caption: 'Quick start',
		icon: RocketLaunchIcon,
		href: '/quick-start',
		active: (pathname: string) =>
			['/quick-start', '/installation', '/releases'].some((e) => pathname.startsWith(e)),
	},
	{
		caption: 'Documentation',
		icon: AcademicCapIcon,
		href: '/docs/editor',
		active: (pathname: string) => ['/docs', '/community'].some((e) => pathname.startsWith(e)),
	},
	{
		caption: 'Reference',
		icon: CommandLineIcon,
		href: '/reference/editor/Editor',
		active: (pathname: string) => pathname.startsWith('/reference'),
	},
	{
		caption: 'Starter kits',
		icon: CubeIcon,
		href: '/starter-kits/overview',
		active: (pathname: string) => ['/starter-kits'].some((e) => pathname.startsWith(e)),
	},
	{
		caption: 'Examples',
		icon: PlayIcon,
		href: '/examples',
		active: (pathname: string) => pathname.startsWith('/examples'),
	},
]

export function DocsCategoryMenu() {
	const pathname = usePathname()
	return (
		<ul className="flex flex-col gap-3 shrink-0 pb-4">
			{categoryLinks.map((item, index) => (
				<li key={index}>
					<NavigationLink {...item} active={item.active(pathname)} />
				</li>
			))}
		</ul>
	)
}
