import { cn } from '@/utils/cn'

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	return (
		<div className={cn('bg-zinc-50 py-1 md:rounded-2xl md:mx-0 md:px-1', className)}>
			<div className="relative w-full h-full bg-zinc-50 md:rounded-xl shadow overflow-hidden">
				{children}
			</div>
		</div>
	)
}
