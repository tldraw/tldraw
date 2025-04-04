import { cn } from '@/utils/cn'

export function SectionProse({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex flex-col w-full max-w-2xl mx-auto px-5 text-black dark:text-white gap-5',
				className
			)}
		>
			{children}
		</div>
	)
}
