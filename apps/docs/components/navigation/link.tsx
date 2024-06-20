'use client'

import { cn } from '@/utils/cn'
import Link from 'next/link'

export const NavigationLink: React.FC<{
	caption: string
	href: string
	active: (pathname: string) => boolean
	pathname: string
}> = ({ caption, href, active, pathname }) => {
	return (
		<Link
			href={href}
			className={cn(active(pathname) ? 'font-semibold text-black' : 'hover:text-zinc-600')}
		>
			{caption}
		</Link>
	)
}
