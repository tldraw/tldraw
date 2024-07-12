import { cn } from '@/utils/cn'
import Link from 'next/link'
import { MouseEventHandler } from 'react'
import { Icon, IconName } from './icon'

export const Button: React.FC<{
	href?: string
	newTab?: boolean
	onClick?: MouseEventHandler<HTMLButtonElement>
	caption: string
	icon?: IconName
	arrow?: 'left' | 'right'
	className?: string
	size?: 'xs' | 'sm' | 'base' | 'lg'
	type?: 'primary' | 'secondary' | 'tertiary'
}> = ({ href, newTab, onClick, caption, icon, className, size = 'base', type = 'primary' }) => {
	const iconSizes = { xs: 'h-3', sm: 'h-3.5', base: 'h-4', lg: 'h-5' }
	const textSizes = { xs: 'text-xs', sm: 'text-sm', base: 'text-base', lg: 'text-lg' }
	className = cn(
		'flex items-center',
		size === 'xs' && 'h-6 px-2 gap-1.5 rounded-md',
		size === 'sm' && 'h-7 px-3 gap-2 rounded-md',
		size === 'base' && 'h-9 px-4 gap-2.5 rounded-lg',
		size === 'lg' && 'h-11 px-5 gap-3 rounded-xl',
		textSizes[size],
		type === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600',
		type === 'secondary' && 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
		className
	)
	if (href)
		return (
			<Link
				href={href}
				target={newTab ? '_blank' : undefined}
				rel={newTab ? 'noopener noreferrer' : undefined}
				className={className}
			>
				{icon && <Icon icon={icon} className={cn(iconSizes[size])} />}
				<span>{caption}</span>
			</Link>
		)
	if (onClick)
		return (
			<button onClick={onClick} className={className}>
				{icon && <Icon icon={icon} className={cn(iconSizes[size])} />}
				<span>{caption}</span>
			</button>
		)
	return null
}
