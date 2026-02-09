'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface WhiteboardFeature {
	title: string
	description: string
}

interface WhiteboardKitSectionProps {
	eyebrow: string
	title: string
	description: string
	ctaLabel: string
	ctaUrl: string
	features: WhiteboardFeature[]
}

export function WhiteboardKitSection({
	eyebrow,
	title,
	description,
	ctaLabel,
	ctaUrl,
	features,
}: WhiteboardKitSectionProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-2xl">
					<p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
						{eyebrow}
					</p>
					<h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
						{title}
					</h2>
					<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{description}</p>
					<Link
						href={ctaUrl}
						className="mt-6 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
					>
						{ctaLabel} &rarr;
					</Link>
				</div>
				<div className="mx-auto mt-12 grid max-w-2xl gap-8 sm:grid-cols-3">
					{features.map((feature, i) => (
						<motion.div
							key={feature.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1 }}
						>
							<h3 className="text-base font-semibold text-zinc-900 dark:text-white">
								{feature.title}
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
								{feature.description}
							</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
