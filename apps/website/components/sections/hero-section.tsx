'use client'

import { ChevronRight } from '@/components/ui/chevron-icon'
import { CodeCopyButton } from '@/components/ui/code-copy-button'
import Link from 'next/link'

interface HeroSectionProps {
	title: string
	subtitle: string
	subtitleHighlight?: string
	ctaPrimary: { label: string; url: string; variant?: 'code' }
	ctaSecondary?: { label: string; labelBold?: string; url: string }
	heroImage?: React.ReactNode
	/** Pre-rendered syntax-highlighted HTML for code CTA (from Shiki) */
	codeHtml?: string
}

export function HeroSection({
	title,
	subtitle,
	subtitleHighlight,
	ctaPrimary,
	ctaSecondary,
	heroImage,
	codeHtml,
}: HeroSectionProps) {
	const subtitleEl =
		subtitleHighlight && subtitle.includes(subtitleHighlight) ? (
			<>
				{subtitle.slice(0, subtitle.indexOf(subtitleHighlight))}
				<span className="font-medium text-brand-blue dark:text-blue-400">{subtitleHighlight}</span>
				{subtitle.slice(subtitle.indexOf(subtitleHighlight) + subtitleHighlight.length)}
			</>
		) : (
			subtitle
		)

	return (
		<section className="relative overflow-hidden">
			<div className="mx-auto max-w-content px-4 pb-8 pt-20 sm:px-6 sm:pb-8 sm:pt-32 lg:px-8">
				<div className="max-w-3xl">
					<h1 className="text-4xl font-semibold tracking-heading text-black dark:text-white sm:text-5xl lg:text-6xl">
						{title}
					</h1>
					<p className="mt-6 text-lg leading-8 text-body dark:text-zinc-400">{subtitleEl}</p>
					<div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
						{ctaPrimary.variant === 'code' ? (
							<CodeCopyButton
								code={ctaPrimary.label}
								className="dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
							>
								{codeHtml ? (
									<span
										className="hero-code-content [&_.shiki]:!m-0 [&_.shiki]:!p-0 [&_pre]:!m-0 [&_pre]:!inline"
										dangerouslySetInnerHTML={{ __html: codeHtml }}
									/>
								) : (
									<>
										<span className="text-zinc-400">$</span> {ctaPrimary.label}
									</>
								)}
							</CodeCopyButton>
						) : (
							<Link
								href={ctaPrimary.url}
								className="rounded-md bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
							>
								{ctaPrimary.label}
							</Link>
						)}
						{ctaSecondary && (
							<Link
								href={ctaSecondary.url}
								className="inline-flex items-center gap-1.5 text-sm text-body transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
							>
								{ctaSecondary.labelBold ? (
									<>
										or{' '}
										<span className="font-semibold text-brand-blue underline underline-offset-4">
											{ctaSecondary.labelBold}
										</span>{' '}
										<ChevronRight />
									</>
								) : (
									<>
										{ctaSecondary.label} <ChevronRight />
									</>
								)}
							</Link>
						)}
					</div>
				</div>
				{heroImage && <div className="mt-12 lg:mt-16">{heroImage}</div>}
			</div>
		</section>
	)
}
