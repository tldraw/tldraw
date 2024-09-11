'use client'

import { cn } from '@/utils/cn'
import { MagnifyingGlassIcon as MagnifyingGlassIconSmall } from '@heroicons/react/20/solid'
import {
	MagnifyingGlassIcon as MagnifyingGlassIconLarge,
	XMarkIcon,
} from '@heroicons/react/24/solid'
import { Command } from 'cmdk'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search } from '.'

export function SearchButton({
	type,
	layout,
	className,
}: {
	type: 'docs' | 'blog'
	layout: 'mobile' | 'desktop'
	className?: string
}) {
	const [open, setOpen] = useState(false)
	const pathname = usePathname()

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				setOpen((open) => !open)
			}
		}
		if (layout !== 'desktop') return
		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [layout])

	useEffect(() => {
		setOpen(false)
	}, [pathname])

	return (
		<div className={cn('group', className)}>
			<button
				className={cn(
					'flex items-center text-black dark:text-white focus:outline-none',
					layout === 'desktop' &&
						'w-full h-10 justify-between bg-zinc-50 dark:bg-zinc-900 px-4 cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500',
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
					<span
						className={cn(
							'capitalize text-sm text-zinc-400 dark:text-zinc-600',
							layout === 'mobile' && 'hidden'
						)}
					>
						Search {type}…
					</span>
				</div>
				<span className={cn('text-xs', layout === 'mobile' && 'hidden')}>⌘K</span>
			</button>
			<Command.Dialog key="hi" open={open} onOpenChange={setOpen} className="relative z-20">
				<div className="fixed w-screen h-screen left-0 top-14 sm:top-[6.5rem] md:top-0 bg-white/90 dark:bg-zinc-950/90 pointer-events-none">
					<div className="w-full max-w-3xl mx-auto px-5 lg:px-12 pt-[4.5rem]">
						<Search type={type} onClose={() => setOpen(false)} />
					</div>
				</div>
			</Command.Dialog>
		</div>
	)
}
