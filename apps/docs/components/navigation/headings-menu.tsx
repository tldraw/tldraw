'use client'

import { ArticleHeading } from '@/types/content-types'
import { cn } from '@/utils/cn'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function HeadingsMenu({ headings }: { headings: ArticleHeading[] }) {
	const [activeSlug, setActiveSlug] = useState('')

	useEffect(() => {
		const handleScroll = () => {
			let current = ''
			for (const { slug } of headings) {
				const element = document.getElementById(slug)
				if (element && element.getBoundingClientRect().top < 100) current = slug
			}
			setActiveSlug(current)
		}
		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [headings])

	if (headings.length === 0) return null

	return (
		<div className="relative overflow-y-auto shrink mb-12">
			<div className="sticky top-0">
				<h4 className="block text-xs font-semibold text-black uppercase bg-white dark:bg-zinc-950 dark:text-white">
					On this page
				</h4>
				<div className="w-full h-2 bg-gradient-to-b from-white dark:from-zinc-950" />
			</div>
			<ul className="flex flex-col gap-2 text-sm break-words">
				{headings.map(({ title, level, slug }, index) => (
					<li key={index} style={{ paddingLeft: `${(level - 2) * 0.75}rem` }}>
						<Link
							href={`#${slug}`}
							className={cn(
								slug === activeSlug
									? 'text-black dark:text-white font-semibold'
									: 'hover:text-zinc-800 dark:hover:text-zinc-100'
							)}
						>
							{title}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
