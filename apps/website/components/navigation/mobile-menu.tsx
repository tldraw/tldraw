'use client'

import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from '@/sanity/types'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface MobileMenuProps {
	open: boolean
	onClose(): void
	navGroups: NavGroup[]
	standaloneNavLinks: NavItem[]
}

export function MobileMenu({ open, onClose, navGroups, standaloneNavLinks }: MobileMenuProps) {
	const pathname = usePathname()
	const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

	function toggleGroup(label: string) {
		setExpandedGroup((prev) => (prev === label ? null : label))
	}

	// Lock body scroll when menu is open
	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
			document.body.style.overscrollBehavior = 'none'
		} else {
			document.body.style.overflow = ''
			document.body.style.overscrollBehavior = ''
		}
		return () => {
			document.body.style.overflow = ''
			document.body.style.overscrollBehavior = ''
		}
	}, [open])

	return (
		<>
			{/* Backdrop - starts below header so header stays visible */}
			<div
				className={cn(
					'fixed inset-x-0 bottom-0 top-[72px] z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-200 md:hidden',
					open ? 'opacity-100' : 'pointer-events-none opacity-0'
				)}
				onClick={onClose}
			/>
			{/* Panel - drops down from below header; only on mobile; wrapper clips so closed state shows nothing */}
			<div
				className={cn(
					'fixed left-0 right-0 top-[72px] z-50 overflow-hidden md:hidden',
					open ? 'max-h-[calc(100vh-72px)]' : 'max-h-0'
				)}
			>
				<div
					className={cn(
						'max-h-[calc(100vh-72px)] overflow-y-auto border-b border-zinc-100 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900'
					)}
				>
					<nav className="flex flex-col gap-1">
						{navGroups.map((group) => (
							<div key={group.label}>
								<button
									type="button"
									onClick={() => toggleGroup(group.label)}
									className={cn(
										'flex w-full items-center justify-between rounded-lg px-4 py-3 text-base transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
										expandedGroup === group.label
											? 'text-black dark:text-white'
											: 'text-body dark:text-zinc-400'
									)}
								>
									{group.label}
									<svg
										className={cn(
											'h-4 w-4 transition-transform',
											expandedGroup === group.label && 'rotate-180'
										)}
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth="2"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M19.5 8.25l-7.5 7.5-7.5-7.5"
										/>
									</svg>
								</button>
								<div
									className={cn(
										'grid transition-[grid-template-rows] duration-200',
										expandedGroup === group.label ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
									)}
								>
									<div className="overflow-hidden">
										<div className="pb-2 pl-4">
											{group.items.map((item) => (
												<Link
													key={item.label + item.href}
													href={item.href}
													onClick={onClose}
													className={cn(
														'block rounded-lg px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
														pathname?.startsWith(item.href)
															? 'text-black dark:text-white'
															: 'text-body dark:text-zinc-400'
													)}
												>
													{item.label}
												</Link>
											))}
										</div>
									</div>
								</div>
							</div>
						))}
						{standaloneNavLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								onClick={onClose}
								className={cn(
									'rounded-lg px-4 py-3 text-base transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
									pathname?.startsWith(link.href)
										? 'text-black dark:text-white'
										: 'text-body dark:text-zinc-400'
								)}
							>
								{link.label}
							</Link>
						))}
						<Link
							href="/quick-start"
							onClick={onClose}
							className="mt-4 rounded-lg bg-brand-blue px-4 py-3 text-center text-base text-white transition-colors hover:bg-blue-700"
						>
							Quick Start
						</Link>
					</nav>
				</div>
			</div>
		</>
	)
}
