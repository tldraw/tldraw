'use client'

import { Icon, IconName } from '@/components/common/icon'
import { cn } from '@/utils/cn'
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { MouseEventHandler } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader } from './loader'

export const Button: React.FC<{
	href?: string
	newTab?: boolean
	onClick?: MouseEventHandler<HTMLButtonElement>
	submit?: boolean
	caption: string
	icon?: IconName
	arrow?: 'left' | 'right'
	className?: string
	size?: 'xs' | 'sm' | 'base' | 'lg'
	type?: 'primary' | 'secondary' | 'tertiary' | 'black'
	darkRingOffset?: boolean
	loading?: boolean
}> = ({
	href,
	newTab,
	onClick,
	submit = false,
	caption,
	icon,
	arrow,
	className,
	size = 'base',
	type = 'primary',
	darkRingOffset,
	loading,
}) => {
	const { pending } = useFormStatus()
	const iconSizes = { xs: 'h-3', sm: 'h-3.5', base: 'h-4', lg: 'h-5' }
	className = cn(
		'relative overflow-hidden flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
		darkRingOffset ? 'focus:ring-offset-zinc-900' : 'focus:ring-offset-zinc-50',
		size === 'xs' && 'h-6 px-2 gap-1.5 rounded-md text-xs',
		size === 'sm' && 'h-7 px-3 gap-2 rounded-md text-sm',
		size === 'base' && 'h-9 px-4 gap-2.5 rounded-lg text-base',
		size === 'lg' && 'h-11 px-5 gap-3 rounded-xl text-lg',
		type === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600',
		type === 'black' && 'bg-black text-white hover:bg-zinc-800',
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
				{arrow === 'left' && <ArrowLongLeftIcon className={cn(iconSizes[size])} />}
				{icon && <Icon icon={icon} className={cn(iconSizes[size])} />}
				<span>{caption}</span>
				{arrow === 'right' && <ArrowLongRightIcon className={cn(iconSizes[size])} />}
			</Link>
		)
	if (onClick)
		return (
			<button onClick={onClick} className={className}>
				{arrow === 'left' && <ArrowLongLeftIcon className={cn(iconSizes[size])} />}
				{icon && <Icon icon={icon} className={cn(iconSizes[size])} />}
				<span>{caption}</span>
				{arrow === 'right' && <ArrowLongRightIcon className={cn(iconSizes[size])} />}
				{loading && (
					<div
						className={cn(
							'absolute inset-0 flex items-center justify-center',
							type === 'primary' && 'bg-blue-500',
							type === 'black' && 'bg-black',
							type === 'secondary' && 'bg-zinc-100'
						)}
					>
						<Loader className="w-5" />
					</div>
				)}
			</button>
		)
	if (submit)
		return (
			<button type="submit" disabled={pending} className={className}>
				{arrow === 'left' && <ArrowLongLeftIcon className={cn(iconSizes[size])} />}
				{icon && <Icon icon={icon} className={cn(iconSizes[size])} />}
				<span>{caption}</span>
				{arrow === 'right' && <ArrowLongRightIcon className={cn(iconSizes[size])} />}
				{(pending || loading) && (
					<div
						className={cn(
							'absolute inset-0 flex items-center justify-center',
							type === 'primary' && 'bg-blue-500',
							type === 'black' && 'bg-black',
							type === 'secondary' && 'bg-zinc-100'
						)}
					>
						<Loader className="w-5" />
					</div>
				)}
			</button>
		)
	return null
}
