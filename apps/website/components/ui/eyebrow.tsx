import { cn } from '@/lib/utils'

interface EyebrowProps {
	children: React.ReactNode
	className?: string
}

export function Eyebrow({ children, className }: EyebrowProps) {
	return (
		<p
			className={cn(
				'text-xs font-semibold uppercase tracking-widest text-brand-blue dark:text-blue-400',
				className
			)}
		>
			{children}
		</p>
	)
}
