'use client'

import { cn } from '@/utils/cn'
import { MagnifyingGlassIcon as MagnifyingGlassIconSmall } from '@heroicons/react/20/solid'
import {
	MagnifyingGlassIcon as MagnifyingGlassIconLarge,
	XMarkIcon,
} from '@heroicons/react/24/solid'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { twJoin } from 'tailwind-merge'
import { Search } from '.'

export function SearchButton({
	type,
	layout,
	className,
}: {
	type: 'docs' | 'blog'
	layout: 'mobile' | 'desktop' | 'keyboard-shortcut-only'
	className?: string
}) {
	const [open, setOpen] = useState(false)
	const pathname = usePathname()

	useEffect(() => {
		if (layout !== 'desktop' && layout !== 'keyboard-shortcut-only') return

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === '/') {
				setOpen(true)
			} else if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				setOpen((open) => !open)
			} else if (e.key === 'Escape') {
				setOpen(false)
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [layout])

	useEffect(() => {
		setOpen(false)
	}, [pathname])

	if (layout === 'keyboard-shortcut-only') {
		return open ? <Search type={type} onClose={() => setOpen(false)} /> : null
	}

	return (
		<div className={cn('group', className)}>
			<button
				className={cn(
					'flex items-center text-black dark:text-white focus:outline-none',
					layout === 'desktop' &&
						twJoin(
							'w-full h-10 justify-between bg-zinc-50 dark:bg-zinc-900 px-4 cursor-text',
							'hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg focus:ring-2',
							'focus:ring-blue-500'
						),
					layout === 'mobile' &&
						'w-8 h-8 justify-center rounded focus:bg-zinc-100 dark:focus:bg-zinc-800'
				)}
				onClick={() => setOpen((open) => !open)}
			>
				<div className="flex items-center gap-3">
					{open ? (
						<XMarkIcon className="h-6 md:hidden" />
					) : (
						<>
							<MagnifyingGlassIconSmall className={cn('h-4', layout === 'mobile' && 'hidden')} />
							<MagnifyingGlassIconLarge className={cn('h-6', layout === 'desktop' && 'hidden')} />
						</>
					)}
					{!open && (
						<span
							className={cn(
								'capitalize text-sm text-zinc-400 dark:text-zinc-600',
								layout === 'mobile' && 'hidden'
							)}
						>
							Search {type}…
						</span>
					)}
				</div>
				<span className={cn('text-xs', layout === 'mobile' && 'hidden')}>⌘K</span>
			</button>

			{open && <Search type={type} onClose={() => setOpen(false)} />}
		</div>
	)
}
