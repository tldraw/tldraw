'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileMenuProps {
	open: boolean
	onClose: () => void
	links: { label: string; href: string }[]
}

export function MobileMenu({ open, onClose, links }: MobileMenuProps) {
	const pathname = usePathname()

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
							{links.map((link) => (
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
								href="/get-a-license"
								onClick={onClose}
								className="mt-4 rounded-lg bg-zinc-900 px-4 py-3 text-center text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
							>
								Get a license
							</Link>
						</nav>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}
