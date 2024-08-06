import { cn } from '@/utils/cn'

export const PageTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	return <h1 className={cn('font-black text-black text-3xl sm:text-4xl', className)}>{children}</h1>
}
