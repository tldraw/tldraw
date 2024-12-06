import { cn } from '@/utils/cn'

export function Section({
	id,
	children,
	className,
}: {
	id?: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<section
			id={id}
			className={cn('w-full max-w-screen-xl mx-auto md:px-6 my-32 lg:my-40', className)}
		>
			{children}
		</section>
	)
}
