import { cn } from '@/lib/utils'

interface CheckIconProps {
	className?: string
}

export function CheckIcon({ className }: CheckIconProps) {
	return (
		<svg
			className={cn('text-brand-blue mt-0.5 h-4 w-4 shrink-0', className)}
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="2"
			stroke="currentColor"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
		</svg>
	)
}
