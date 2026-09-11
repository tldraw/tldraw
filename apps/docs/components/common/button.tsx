'use client'

import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { MouseEventHandler } from 'react'
import { track } from '@/app/analytics'
import { Icon, IconName } from '@/components/common/icon'
import { cn } from '@/utils/cn'

export function Button({
	id,
	href,
	newTab,
	onClick,
	caption,
	icon,
	arrow,
	className,
	size = 'base',
	type = 'primary',
	darkRingOffset,
}: {
	id?: string
	href?: string
	newTab?: boolean
	onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
	caption: string
	icon?: IconName
	arrow?: 'left' | 'right'
	className?: string
	size?: 'xs' | 'sm' | 'base' | 'lg'
	type?: 'primary' | 'secondary' | 'tertiary' | 'black'
	darkRingOffset?: boolean
}) {
	const iconSizes = { xs: 'h-3', sm: 'h-3.5', base: 'h-4', lg: 'h-5' }
	className = cn(
		'relative overflow-hidden flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-zinc-900',
		darkRingOffset ? 'focus:ring-offset-zinc-900' : 'focus:ring-offset-zinc-50',
		size === 'xs' && 'h-6 px-2 gap-1.5 rounded-md text-xs',
		size === 'sm' && 'h-7 px-3 gap-2 rounded-md text-sm',
		size === 'base' && 'h-9 px-4 gap-2.5 rounded-lg text-base',
		size === 'lg' && 'h-11 px-5 gap-3 rounded-xl text-lg',
		type === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600 dark:hover:bg-blue-400',
		type === 'black' &&
			'bg-black text-white dark:text-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100',
		type === 'secondary' &&
			'bg-zinc-100 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700',
		type === 'tertiary' &&
			'text-black dark:text-white dark:hover:text-zinc-200 hover:text-zinc-700',
		className
	)
	// no word wrapping
	const spanClassName = cn('whitespace-nowrap')
	if (href)
		return (
			<Link
				href={href}
				target={newTab ? '_blank' : undefined}
				rel={newTab ? 'noopener noreferrer' : undefined}
				className={className}
				onClick={(e) => {
					onClick?.(e)
					if (id) track('button', { id })
				}}
			>
				{arrow === 'left' && <ArrowLongLeftIcon className={cn(iconSizes[size])} />}
				{icon && <Icon icon={icon} className={cn(iconSizes[size])} />}
				<span className={spanClassName}>{caption}</span>
				{arrow === 'right' && <ArrowLongRightIcon className={cn(iconSizes[size])} />}
			</Link>
		)
	if (onClick)
		return (
			<button
				onClick={(e) => {
					if (id) track('button', { id })
					onClick?.(e)
				}}
				className={className}
			>
				{arrow === 'left' && <ArrowLongLeftIcon className={cn(iconSizes[size])} />}
				{icon && <Icon icon={icon} className={cn(iconSizes[size])} />}
				<span className={spanClassName}>{caption}</span>
				{arrow === 'right' && <ArrowLongRightIcon className={cn(iconSizes[size])} />}
			</button>
		)
	return null
}
