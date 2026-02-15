import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ChevronRight } from './chevron-icon'

interface ActionLinkProps {
	href: string
	children: React.ReactNode
	className?: string
	underline?: boolean
	external?: boolean
}

export function ActionLink({
	href,
	children,
	className,
	underline = false,
	external,
}: ActionLinkProps) {
	const classes = cn(
		'inline-flex items-center gap-1.5 text-sm font-medium text-brand-link hover:text-brand-link/90 dark:hover:text-brand-link/90',
		underline && 'underline underline-offset-4',
		className
	)

	if (external) {
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
				{children} <ChevronRight />
			</a>
		)
	}

	return (
		<Link href={href} className={classes}>
			{children} <ChevronRight />
		</Link>
	)
}
