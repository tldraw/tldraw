'use client'

import { navGroups, standaloneNavLinks } from '@/content/homepage'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface MobileMenuProps {
	open: boolean
	onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
	const pathname = usePathname()
	const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

	function toggleGroup(label: string) {
		setExpandedGroup((prev) => (prev === label ? null : label))
	}

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
						onClick={onClose}
					/>
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 30, stiffness: 300 }}
						className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white p-6 shadow-xl dark:bg-zinc-900"
					>
						<div className="flex items-center justify-end">
							<button
								type="button"
								className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
								onClick={onClose}
							>
								<span className="sr-only">Close menu</span>
								<svg
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<nav className="mt-6 flex flex-col gap-1">
							{navGroups.map((group) => (
								<div key={group.label}>
									<button
										type="button"
										onClick={() => toggleGroup(group.label)}
										className={cn(
											'flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
											expandedGroup === group.label
												? 'text-zinc-900 dark:text-white'
												: 'text-zinc-600 dark:text-zinc-400'
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
									<AnimatePresence>
										{expandedGroup === group.label && (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: 'auto', opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: 0.2 }}
												className="overflow-hidden"
											>
												<div className="pb-2 pl-4">
													{group.items.map((item) => (
														<Link
															key={item.label + item.href}
															href={item.href}
															onClick={onClose}
															className={cn(
																'block rounded-lg px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
																pathname?.startsWith(item.href)
																	? 'text-zinc-900 dark:text-white'
																	: 'text-zinc-500 dark:text-zinc-400'
															)}
														>
															{item.label}
														</Link>
													))}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							))}
							{standaloneNavLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									onClick={onClose}
									className={cn(
										'rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
										pathname?.startsWith(link.href)
											? 'text-zinc-900 dark:text-white'
											: 'text-zinc-600 dark:text-zinc-400'
									)}
								>
									{link.label}
								</Link>
							))}
							<Link
								href="/quick-start"
								onClick={onClose}
								className="mt-4 rounded-lg bg-zinc-900 px-4 py-3 text-center text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
							>
								Quick Start
							</Link>
						</nav>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}
