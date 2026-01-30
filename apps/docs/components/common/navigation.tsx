'use client'

import { cn } from '@/utils/cn'

export function Navigation({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	return (
		<nav
			className={cn('w-52 lg:w-60 shrink-0 flex flex-col sticky top-24 overflow-hidden', className)}
			style={{
				height: 'calc(100vh - 6rem)',
			}}
		>
			{children}
		</nav>
	)
}
