'use client'

import { ActionLink } from '@/components/ui/action-link'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import Image from 'next/image'
import { useState } from 'react'

interface StarterKit {
	title: string
	description: string
	url: string
}

interface StarterKitsSectionProps {
	title: string
	subtitle: string
	ctaLabel: string
	ctaUrl: string
	kits: StarterKit[]
}

export function StarterKitsSection({
	title,
	subtitle,
	ctaLabel,
	ctaUrl,
	kits,
}: StarterKitsSectionProps) {
	const [openIndex, setOpenIndex] = useState(0)

	return (
		<Section bg="muted">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<SectionHeading title={title} description={subtitle} />
				<ActionLink href={ctaUrl} underline>
					{ctaLabel}
				</ActionLink>
			</div>
			<div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
				<div className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
					{kits.map((kit, i) => (
						<div key={kit.title}>
							<button
								type="button"
								onClick={() => setOpenIndex(i)}
								className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
							>
								<h3 className="text-lg font-semibold text-black dark:text-white">{kit.title}</h3>
								<svg
									className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M19.5 8.25l-7.5 7.5-7.5-7.5"
									/>
								</svg>
							</button>
							{openIndex === i && (
								<div className="border-t border-zinc-200 px-6 pt-2 pb-4 dark:border-zinc-800">
									<p className="text-body text-sm leading-relaxed dark:text-zinc-400">
										{kit.description}
									</p>
									<ActionLink href={kit.url} underline className="mt-4">
										Learn more
									</ActionLink>
								</div>
							)}
						</div>
					))}
				</div>
				<div className="relative aspect-video overflow-hidden rounded-md border border-zinc-200 bg-white lg:aspect-4/3 dark:border-zinc-800 dark:bg-zinc-950">
					<Image
						src="/images/starter-kits-preview.png"
						alt="tldraw starter kits"
						fill
						className="object-cover"
						sizes="(max-width: 1024px) 100vw, 50vw"
					/>
				</div>
			</div>
		</Section>
	)
}
