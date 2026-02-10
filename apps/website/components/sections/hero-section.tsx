'use client'

import Link from 'next/link'
import { useState } from 'react'

interface HeroSectionProps {
	title: string
	subtitle: string
	subtitleHighlight?: string
	ctaPrimary: { label: string; url: string; variant?: 'code' }
	ctaSecondary?: { label: string; labelBold?: string; url: string }
	heroImage?: React.ReactNode
}

export function HeroSection({
	title,
	subtitle,
	subtitleHighlight,
	ctaPrimary,
	ctaSecondary,
	heroImage,
}: HeroSectionProps) {
	const [copied, setCopied] = useState(false)

	function handleCopy() {
		navigator.clipboard.writeText(ctaPrimary.label)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

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
			<div className="mx-auto max-w-content px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8">
				<div className="max-w-3xl">
					<h1 className="text-4xl font-semibold tracking-heading text-black dark:text-white sm:text-5xl lg:text-6xl">
						{title}
					</h1>
					<p className="mt-6 text-lg leading-8 text-body dark:text-zinc-400">{subtitleEl}</p>
					<div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
						{ctaPrimary.variant === 'code' ? (
							<button
								onClick={handleCopy}
								className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 font-mono text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
							>
								<span className="text-zinc-400">$</span> {ctaPrimary.label}
								<svg
									className="h-4 w-4 text-zinc-400 dark:text-zinc-400"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									{copied ? (
										<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
									) : (
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
										/>
									)}
								</svg>
							</button>
						) : (
							<Link
								href={ctaPrimary.url}
								className="rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
							>
								{ctaPrimary.label}
							</Link>
						)}
						{ctaSecondary && (
							<Link
								href={ctaSecondary.url}
								className="text-sm text-body transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
							>
								{ctaSecondary.labelBold ? (
									<>
										or{' '}
										<span className="font-semibold text-brand-blue underline underline-offset-4">
											{ctaSecondary.labelBold}
										</span>{' '}
										&rarr;
									</>
								) : (
									<>
										{ctaSecondary.label} <span aria-hidden="true">&rarr;</span>
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
