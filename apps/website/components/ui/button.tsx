import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ButtonProps {
	variant?: 'primary' | 'blue'
	href?: string
	children: React.ReactNode
	className?: string
	type?: 'button' | 'submit'
	onClick?: () => void
}

const variants = {
	primary:
		'rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
	blue: 'rounded-md bg-brand-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700',
}

export function Button({
	variant = 'primary',
	href,
	children,
	className,
	type,
	onClick,
}: ButtonProps) {
	const classes = cn('inline-flex items-center gap-1.5', variants[variant], className)

	if (href) {
		return (
			<Link href={href} className={classes}>
				{children}
			</Link>
		)
	}

	return (
		<button type={type ?? 'button'} onClick={onClick} className={classes}>
			{children}
		</button>
	)
}
