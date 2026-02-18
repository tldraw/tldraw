import { Icon } from '@/components/common/icon'
import type React from 'react'

export function CheckItem({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400">
			<Icon icon="check" className="mt-1 h-5 w-5 shrink-0 text-zinc-900 dark:text-zinc-100" />
			<span>{children}</span>
		</div>
	)
}
