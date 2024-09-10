import { cn } from '@/utils/cn'
import {
	ExclamationCircleIcon,
	ExclamationTriangleIcon,
	InformationCircleIcon,
} from '@heroicons/react/20/solid'

export function Callout({
	type = 'info',
	children,
}: {
	type?: 'info' | 'warning' | 'critical'
	children: React.ReactNode
}) {
	return (
		<div
			className={cn(
				'py-1 -mx-5 md:mx-0 md:px-1 md:rounded-2xl',
				type === 'info' && 'bg-blue-50 dark:bg-blue-950/75',
				type === 'warning' && 'bg-amber-50 dark:bg-amber-900/50',
				type === 'critical' && 'bg-rose-50 dark:bg-rose-950/50'
			)}
		>
			<div
				className={cn(
					'flex flex-col sm:flex-row gap-4 w-full shadow p-5 md:rounded-xl',
					type === 'info' && 'dark:bg-blue-900/25',
					type === 'warning' && 'dark:bg-amber-900/25',
					type === 'critical' && 'dark:bg-rose-900/25'
				)}
			>
				{type === 'info' && <InformationCircleIcon className="size-5 shrink-0 text-blue-500" />}
				{type === 'warning' && (
					<ExclamationTriangleIcon className="size-5 shrink-0 text-amber-500 dark:text-amber-400" />
				)}
				{type === 'critical' && (
					<ExclamationCircleIcon className="size-5 shrink-0 text-rose-500 dark:text-rose-400" />
				)}
				<div className="-mt-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
			</div>
		</div>
	)
}
