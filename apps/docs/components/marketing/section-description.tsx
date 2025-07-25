import { cn } from '@/utils/cn'

export function SectionSubtitle({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<h3
			className={cn(`text-center max-w-lg text-balance mb-16 mx-auto px-5 md:px-0 pt-6`, className)}
		>
			{children}
		</h3>
	)
}
