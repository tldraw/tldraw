import { cn } from '@/utils/cn'
import { ReactNode } from 'react'

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<h2
			className={cn(
				'text-black dark:text-white font-black text-2xl sm:text-3xl md:text-4xl text-center px-5 md:px-0',
				className
			)}
		>
			{children}
		</h2>
	)
}
