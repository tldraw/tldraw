'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Guide {
	slug: string
	title: string
	section: string
}

interface SidebarProps {
	guides: Guide[]
}

export function Sidebar({ guides }: SidebarProps) {
	const pathname = usePathname()

	const sections = guides.reduce<Record<string, Guide[]>>((acc, guide) => {
		if (!acc[guide.section]) acc[guide.section] = []
		acc[guide.section].push(guide)
		return acc
	}, {})

	return (
		<aside className="hidden md:block w-52 lg:w-60 shrink-0 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pr-4 pb-8">
			<nav>
				{Object.entries(sections).map(([section, sectionGuides]) => (
					<div key={section} className="mb-6">
						<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
							{section}
						</p>
						<ul className="space-y-0.5">
							{sectionGuides.map((guide) => {
								const href = `/${guide.slug}`
								const isActive = pathname === href
								return (
									<li key={guide.slug}>
										<Link
											href={href}
											className={
												isActive
													? 'block px-2 py-1.5 rounded-md text-sm font-medium text-blue-500 bg-blue-50 dark:bg-blue-950/30'
													: 'block px-2 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors'
											}
										>
											{guide.title}
										</Link>
									</li>
								)
							})}
						</ul>
					</div>
				))}
			</nav>
		</aside>
	)
}
