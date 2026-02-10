import { cn } from '@/lib/utils'
import Link from 'next/link'

type CardProps = {
	children: React.ReactNode
	className?: string
	hover?: boolean
} & ({ as?: 'div'; href?: never } | { as: typeof Link; href: string })

export function Card({ children, className, hover, ...rest }: CardProps) {
	const classes = cn(
		'rounded-xl border border-zinc-200 p-6 dark:border-zinc-800',
		hover && 'transition-colors hover:border-zinc-300 dark:hover:border-zinc-700',
		className
	)

	if ('as' in rest && rest.as === Link) {
		return (
			<Link href={rest.href} className={classes}>
				{children}
			</Link>
		)
	}

	return <div className={classes}>{children}</div>
}
