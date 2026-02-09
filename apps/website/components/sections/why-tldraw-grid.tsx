'use client'

import { motion } from 'framer-motion'

interface WhyTldrawItem {
	title: string
	description: string
}

interface WhyTldrawGridProps {
	title: string
	items: WhyTldrawItem[]
}

export function WhyTldrawGrid({ title, items }: WhyTldrawGridProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
					{title}
				</h2>
				<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{items.map((item, i) => (
						<motion.div
							key={item.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1 }}
						>
							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
							<p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
								{item.description}
							</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
