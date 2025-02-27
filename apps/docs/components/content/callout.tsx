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
	type?: 'info' | 'warning' | 'critical' | 'quote'
	children: React.ReactNode
}) {
	return (
		<div
			className={cn(
				'py-1 -mx-5 md:mx-0',
				type === 'info' && 'md:px-1 md:rounded-2xl bg-blue-50 dark:bg-blue-950/75',
				type === 'warning' && 'md:px-1 md:rounded-2xl bg-amber-50 dark:bg-amber-900/50',
				type === 'critical' && 'md:px-1 md:rounded-2xl bg-rose-50 dark:bg-rose-950/50'
			)}
		>
			<div
				className={cn(
					'flex flex-col sm:flex-row gap-4 w-full p-5 ',
					type === 'quote' && 'border-right border-zinc-400 dark:border-zinc-700 border-l-4',
					type === 'info' && 'md:rounded-xl shadow dark:bg-blue-900/25',
					type === 'warning' && 'md:rounded-xl shadow dark:bg-amber-900/25',
					type === 'critical' && 'md:rounded-xl shadow dark:bg-rose-900/25'
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
