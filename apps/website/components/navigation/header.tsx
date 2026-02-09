'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MobileMenu } from './mobile-menu'

const navLinks = [
	{ label: 'Features', href: '/features' },
	{ label: 'Pricing', href: '/pricing' },
	{ label: 'Blog', href: '/blog' },
	{ label: 'Docs', href: '/quick-start' },
	{ label: 'Showcase', href: '/showcase' },
]

export function Header() {
	const pathname = usePathname()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	return (
		<header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-8">
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
					<nav className="hidden items-center gap-1 md:flex">
						{navLinks.map((link) => (
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
					<Link
						href="/get-a-license"
						className="hidden rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 sm:inline-flex"
					>
						Get a license
					</Link>
					<button
						type="button"
						className="inline-flex items-center justify-center rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
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
			<MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} links={navLinks} />
		</header>
	)
}
