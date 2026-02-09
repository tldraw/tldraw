'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface FeatureShowcaseProps {
	title: string
	description: string
	media: React.ReactNode
	reversed?: boolean
}

export function FeatureShowcase({ title, description, media, reversed }: FeatureShowcaseProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div
					className={cn(
						'flex flex-col items-center gap-12 lg:flex-row lg:gap-16',
						reversed && 'lg:flex-row-reverse'
					)}
				>
					<motion.div
						initial={{ opacity: 0, x: reversed ? 20 : -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="flex-1"
					>
						<h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
							{title}
						</h2>
						<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{description}</p>
					</motion.div>
					<motion.div
						initial={{ opacity: 0, x: reversed ? -20 : 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="flex-1"
					>
						{media}
					</motion.div>
				</div>
			</div>
		</section>
	)
}
