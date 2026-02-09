'use client'

import { motion } from 'framer-motion'

interface CommunityStat {
	value: string
	label: string
	linkText: string
	url: string
}

interface CommunitySectionProps {
	title: string
	stats: CommunityStat[]
}

export function CommunitySection({ title, stats }: CommunitySectionProps) {
	return (
		<section className="bg-zinc-50 py-16 dark:bg-zinc-900 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
					{title}
				</h2>
				<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{stats.map((stat, i) => (
						<motion.a
							key={stat.linkText}
							href={stat.url}
							target="_blank"
							rel="noopener noreferrer"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1 }}
							className="flex flex-col items-center rounded-xl border border-zinc-200 p-8 text-center transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
						>
							<span className="text-4xl font-bold text-zinc-900 dark:text-white sm:text-5xl">
								{stat.value}
							</span>
							<p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
								{stat.label}{' '}
								<span className="font-semibold text-zinc-900 dark:text-white">{stat.linkText}</span>
							</p>
						</motion.a>
					))}
				</div>
			</div>
		</section>
	)
}
