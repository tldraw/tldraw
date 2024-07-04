'use client'

import { cn } from '@/utils/cn'
import Link from 'next/link'

export const NavigationLink: React.FC<{
	caption: string
	icon?: any
	href: string
	active: (pathname: string) => boolean
	pathname: string
}> = ({ caption, icon, href, active, pathname }) => {
	const Icon = icon
	return (
		<Link
			href={href}
			className={cn(
				'flex items-center gap-3',
				active(pathname) ? 'font-semibold text-black' : 'hover:text-zinc-600'
			)}
		>
			{icon && (
				<div
					className={cn(
						'h-6 w-6 rounded-lg flex items-center justify-center',
						active(pathname) ? 'bg-black text-white' : 'bg-zinc-100'
					)}
				>
					<Icon className="h-4" />
				</div>
			)}
			<span>{caption}</span>
		</Link>
	)
}
