import { cn } from '@/lib/utils'

interface BadgeProps {
	children: React.ReactNode
	className?: string
}

export function Badge({ children, className }: BadgeProps) {
	return (
		<span
			className={cn(
				'rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
				className
			)}
		>
			{children}
		</span>
	)
}
