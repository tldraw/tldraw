'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface ShowcaseItem {
	company: string
	category: string
	description: string
	url: string
}

interface ShowcaseSectionProps {
	title: string
	subtitle: string
	ctaLabel: string
	ctaUrl: string
	items: ShowcaseItem[]
}

export function ShowcaseSection({
	title,
	subtitle,
	ctaLabel,
	ctaUrl,
	items,
}: ShowcaseSectionProps) {
	return (
		<section className="bg-zinc-50 py-16 dark:bg-zinc-900 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
							{title}
						</h2>
						<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{subtitle}</p>
					</div>
					<Link
						href={ctaUrl}
						className="text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
					>
						{ctaLabel} &rarr;
					</Link>
				</div>
				<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{items.map((item, i) => (
						<motion.div
							key={item.company}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1 }}
							className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
						>
							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
								{item.company}
							</h3>
							<span className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
								{item.category}
							</span>
							<p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
								{item.description}
							</p>
							<Link
								href={item.url}
								className="mt-4 text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
							>
								Read case study &rarr;
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
