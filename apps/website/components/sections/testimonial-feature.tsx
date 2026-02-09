'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface FeaturedTestimonial {
	quote: string
	author: string
	role: string
	company: string
}

interface CaseStudySummary {
	company: string
	description: string
	url: string
}

interface TestimonialFeatureProps {
	featured: FeaturedTestimonial
	caseStudies: CaseStudySummary[]
}

export function TestimonialFeature({ featured, caseStudies }: TestimonialFeatureProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mx-auto max-w-3xl text-center"
				>
					<blockquote className="text-2xl font-medium leading-relaxed text-zinc-900 dark:text-white sm:text-3xl">
						&ldquo;{featured.quote}&rdquo;
					</blockquote>
					<div className="mt-8">
						<p className="font-semibold text-zinc-900 dark:text-white">{featured.author},</p>
						<p className="text-sm text-zinc-500 dark:text-zinc-400">
							{featured.role} at {featured.company}
						</p>
					</div>
				</motion.div>
				<div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{caseStudies.map((study, i) => (
						<motion.div
							key={study.company}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1 }}
							className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
						>
							<h3 className="text-base font-semibold text-zinc-900 dark:text-white">
								{study.company}
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
								{study.description}
							</p>
							<Link
								href={study.url}
								className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
							>
								Read the case study &rarr;
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
