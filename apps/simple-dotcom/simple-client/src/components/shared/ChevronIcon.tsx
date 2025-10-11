import { cn } from '@/lib/utils'

export function ChevronIcon({ className }: { className?: string }) {
	return (
		<svg
			width="15"
			height="15"
			viewBox="0 0 15 15"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path d="M4 6H11L7.5 10.5L4 6Z" fill="currentColor"></path>
		</svg>
	)
}

export function ChevronRightFilledIcon({ className }: { className?: string }) {
	return <ChevronIcon className={cn(className, '-rotate-90')} />
}

export function ChevronLeftFilledIcon({ className }: { className?: string }) {
	return <ChevronIcon className={cn(className)} />
}

export function ChevronDownFilledIcon({ className }: { className?: string }) {
	return <ChevronIcon className={className} />
}

export function ChevronUpFilledIcon({ className }: { className?: string }) {
	return <ChevronIcon className={cn(className, '-rotate-180')} />
}
