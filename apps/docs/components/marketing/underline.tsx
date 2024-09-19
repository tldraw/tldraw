'use client'

import { cn } from '@/utils/cn'
import { motion } from 'framer-motion'

export function Underline({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 407 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn('stroke-current', className)}
		>
			<motion.path
				d="M2 14.0141C42 9.8474 141.9 1.61406 221.5 2.01406C321 2.51406 527 6.01401 305 10.014C127.4 13.2141 264 19.014 354.5 21.514"
				stroke-width="5"
				stroke-linecap="round"
				stroke-linejoin="round"
				initial={{ pathLength: 0, opacity: 0 }}
				animate={{
					pathLength: 1,
					opacity: 1,
					transition: { delay: 0.2, opacity: { delay: 0.2, duration: 0.01 } },
				}}
			/>
		</svg>
	)
}
