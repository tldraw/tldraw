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
			className={cn('w-full w-full max-w-2xl mx-auto md:px-6 pt-[64px] mt-[-64px]', className)}
		>
			{children}
		</section>
	)
}
