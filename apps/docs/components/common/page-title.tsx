import { cn } from '@/utils/cn'

export function PageTitle({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<h1
			className={cn(
				'font-black text-black dark:text-white text-3xl sm:text-4xl break-words max-w-full',
				className
			)}
		>
			{children}
		</h1>
	)
}
