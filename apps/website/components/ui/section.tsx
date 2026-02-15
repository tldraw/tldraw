import { cn } from '@/lib/utils'

interface SectionProps {
	children: React.ReactNode
	className?: string
	bg?: 'muted'
}

export function Section({ children, className, bg }: SectionProps) {
	return (
		<section
			className={cn('py-16 sm:py-24', bg === 'muted' && 'bg-zinc-50 dark:bg-zinc-900', className)}
		>
			<div className="mx-auto max-w-content px-5 sm:px-8">{children}</div>
		</section>
	)
}
