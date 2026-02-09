'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface WhatsInsideItem {
	title: string
	description: string
	url: string
}

interface WhatsInsideGridProps {
	title: string
	subtitle: string
	items: WhatsInsideItem[]
}

export function WhatsInsideGrid({ title, subtitle, items }: WhatsInsideGridProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
						{title}
					</h2>
					<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{subtitle}</p>
				</div>
				<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item, i) => (
						<motion.div
							key={item.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1 }}
							className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
						>
							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
								{item.description}
							</p>
							<Link
								href={item.url}
								className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
							>
								Learn More &rarr;
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
