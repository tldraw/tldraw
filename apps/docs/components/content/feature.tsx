import { Icon, type IconName } from '@/components/common/icon'
import type React from 'react'

export function Feature({
	icon,
	title,
	children,
}: {
	icon: IconName
	title: string
	children: React.ReactNode
}) {
	return (
		<div className="flex flex-col gap-1 not-prose">
			<div className="flex items-center gap-2">
				<Icon icon={icon} className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
				<h3 className="font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
			</div>
			<p className="leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</p>
		</div>
	)
}
