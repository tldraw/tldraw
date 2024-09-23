'use client'

import { NavigationLink } from '@/components/navigation/link'
import { AcademicCapIcon, CommandLineIcon, PlayIcon } from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

const categoryLinks = [
	{
		caption: 'Learn',
		icon: AcademicCapIcon,
		href: '/docs', // there's currently a redirect here, see next.config.js
		active: (pathname: string) =>
			['/quick-start', '/installation', '/releases', '/docs', '/community'].some((e) =>
				pathname.startsWith(e)
			),
	},
	{
		caption: 'Reference',
		icon: CommandLineIcon,
		href: '/reference', // there's currently a redirect here, see next.config.js
		active: (pathname: string) => pathname.startsWith('/reference'),
	},
	{
		caption: 'Examples',
		icon: PlayIcon,
		href: '/examples', // there's currently a redirect here, see next.config.js
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
