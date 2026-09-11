'use client'

import Link from 'next/link'
import { cn } from '@/utils/cn'

export function NavigationLink({
	caption,
	icon,
	href,
	active,
}: {
	caption: string
	icon?: any
	href?: string
	active: boolean
}) {
	const Icon = icon

	if (href)
		return (
			<Link
				href={href}
				className={cn(
					'flex items-center gap-3',
					active
						? 'font-semibold text-black dark:text-white'
						: 'hover:text-zinc-600 dark:hover:text-zinc-100'
				)}
			>
				{icon && (
					<div
						className={cn(
							'h-6 w-6 rounded-md flex items-center justify-center',
							active
								? 'bg-black text-white dark:bg-white dark:text-black'
								: 'bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-300'
						)}
					>
						<Icon className="h-4" />
					</div>
				)}
				<span>{caption}</span>
			</Link>
		)

	return null
}
