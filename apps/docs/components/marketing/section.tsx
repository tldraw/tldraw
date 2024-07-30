import { cn } from '@/utils/cn'

export const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	return (
		<section
			className={cn('w-full max-w-screen-xl mx-auto md:px-5 pt-24 md:pt-32 lg:pt-40', className)}
		>
			{children}
		</section>
	)
}
