'use client'

import { ArticleHeadings } from '@/types/content-types'
import { cn } from '@/utils/cn'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export const HeadingsMenu: React.FC<{ headings: ArticleHeadings }> = ({ headings }) => {
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
		<div className="relative shrink overflow-y-auto">
			<div className="sticky top-0">
				<h4 className="block bg-white text-black uppercase text-xs font-semibold">On this page</h4>
				<div className="h-2 w-full bg-gradient-to-b from-white" />
			</div>
			<ul className="flex flex-col gap-2 text-sm break-words">
				{headings.map(({ title, level, slug }, index) => (
					<li key={index} style={{ paddingLeft: `${(level - 2) * 0.75}rem` }}>
						<Link
							href={`#${slug}`}
							className={cn(
								slug === activeSlug ? 'text-black font-semibold' : 'hover:text-zinc-800'
							)}
						>
							{title}
						</Link>
					</li>
				))}
			</ul>
			<div className="sticky bottom-0 h-12 w-full bg-gradient-to-t from-white via-white" />
		</div>
	)
}
