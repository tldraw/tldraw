'use client'

import { cn } from '@/utils/cn'
import { motion } from 'framer-motion'

export function ArrowDown({
	className,
	animationDelay = 0,
	animationDuration = 0.15,
}: {
	className?: string
	animationDelay?: number
	animationDuration?: number
}) {
	return (
		<svg
			viewBox="0 0 24 60"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn('stroke-current', className)}
		>
			<motion.path
				d="M2 2C10.6667 8.5 25.4 28.1 15 54.5"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={{ pathLength: 0, opacity: 0 }}
				animate={{
					pathLength: 1,
					opacity: 1,
					transition: {
						delay: animationDelay,
						duration: animationDuration,
						opacity: { delay: animationDelay, duration: 0.01 },
					},
				}}
			/>
			<motion.path
				d="M12.127 47.4806L14.1317 57.5791L21.6469 50.5419"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={{ pathLength: 0, opacity: 0 }}
				animate={{
					pathLength: 1,
					opacity: 1,
					transition: {
						delay: animationDelay + animationDuration + 0.1,
						duration: animationDuration,
						opacity: { delay: animationDelay + animationDuration + 0.1, duration: 0.01 },
					},
				}}
			/>
		</svg>
	)
}
