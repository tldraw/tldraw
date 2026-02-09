'use client'

import { navGroups, standaloneNavLinks } from '@/content/homepage'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MobileMenu } from './mobile-menu'

export function Header() {
	const pathname = usePathname()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [openDropdown, setOpenDropdown] = useState<string | null>(null)
	const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	function handleMouseEnter(label: string) {
		if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
		setOpenDropdown(label)
	}

	function handleMouseLeave() {
		dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 150)
	}

	useEffect(() => {
		setOpenDropdown(null)
	}, [pathname])

	return (
		<header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-6">
					<Link href="/" className="flex items-center gap-2">
						<svg
							width="28"
							height="28"
							viewBox="0 0 120 120"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<rect width="120" height="120" rx="24" fill="currentColor" />
							<path d="M38 38h44v10H38V38zm0 17h44v10H38V55zm0 17h28v10H38V72z" fill="white" />
						</svg>
						<span className="text-lg font-semibold">tldraw</span>
					</Link>
					<nav className="hidden items-center gap-1 lg:flex">
						{navGroups.map((group) => (
							<div
								key={group.label}
								className="relative"
								onMouseEnter={() => handleMouseEnter(group.label)}
								onMouseLeave={handleMouseLeave}
							>
								<button
									type="button"
									className={cn(
										'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
										openDropdown === group.label
											? 'text-zinc-900 dark:text-white'
											: 'text-zinc-600 dark:text-zinc-400'
									)}
								>
									{group.label}
									<svg
										className={cn(
											'h-3.5 w-3.5 transition-transform',
											openDropdown === group.label && 'rotate-180'
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
								{openDropdown === group.label && (
									<div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
										{group.items.map((item) => (
											<Link
												key={item.label + item.href}
												href={item.href}
												className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
											>
												{item.label}
											</Link>
										))}
									</div>
								)}
							</div>
						))}
						{standaloneNavLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
									pathname?.startsWith(link.href)
										? 'text-zinc-900 dark:text-white'
										: 'text-zinc-600 dark:text-zinc-400'
								)}
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-3">
					<a
						href="https://github.com/tldraw/tldraw"
						target="_blank"
						rel="noopener noreferrer"
						className="hidden items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:inline-flex"
					>
						<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path
								fillRule="evenodd"
								d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
								clipRule="evenodd"
							/>
						</svg>
						45K
					</a>
					<Link
						href="/quick-start"
						className="hidden rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 sm:inline-flex"
					>
						Quick Start
					</Link>
					<button
						type="button"
						className="inline-flex items-center justify-center rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
						onClick={() => setMobileMenuOpen(true)}
					>
						<span className="sr-only">Open menu</span>
						<svg
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
							/>
						</svg>
					</button>
				</div>
			</div>
			<MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
		</header>
	)
}
