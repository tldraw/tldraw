'use client'

import { cn } from '@/utils/cn'
import { motion, useScroll, useTransform } from 'framer-motion'

export function Navigation({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	const { scrollY } = useScroll()
	const offset = useTransform(scrollY, [0, 80], [80, 0])

	return (
		<nav
			className={cn('w-52 lg:w-60 shrink-0 flex flex-col sticky top-24', className)}
			style={{
				height: 'calc(100vh - 6rem)',
			}}
		>
			{children}
			<motion.div className="shrink-0" style={{ height: offset }} />
		</nav>
	)
}
