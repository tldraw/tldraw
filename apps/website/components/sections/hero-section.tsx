'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface HeroSectionProps {
	title: string
	subtitle: string
	ctaPrimary: { label: string; url: string }
	ctaSecondary?: { label: string; url: string }
	heroImage?: React.ReactNode
}

export function HeroSection({
	title,
	subtitle,
	ctaPrimary,
	ctaSecondary,
	heroImage,
}: HeroSectionProps) {
	return (
		<section className="relative overflow-hidden">
			<div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl"
					>
						{title}
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400"
					>
						{subtitle}
					</motion.p>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="mt-10 flex items-center justify-center gap-4"
					>
						<Link
							href={ctaPrimary.url}
							className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
						>
							{ctaPrimary.label}
						</Link>
						{ctaSecondary && (
							<Link
								href={ctaSecondary.url}
								className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
							>
								{ctaSecondary.label}
							</Link>
						)}
					</motion.div>
				</div>
				{heroImage && (
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, delay: 0.3 }}
						className="mt-16"
					>
						{heroImage}
					</motion.div>
				)}
			</div>
		</section>
	)
}
