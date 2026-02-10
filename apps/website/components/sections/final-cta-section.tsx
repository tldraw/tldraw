'use client'

import Link from 'next/link'
import { useState } from 'react'

export interface FinalCtaSectionProps {
	title: string
	description: string
	descriptionBold: string
	ctaPrimary: { label: string; url: string; variant?: string }
	ctaSecondary: { label?: string; labelBold?: string; url: string }
}

export function FinalCtaSection({
	title,
	description,
	descriptionBold,
	ctaPrimary,
	ctaSecondary,
}: FinalCtaSectionProps) {
	const [copied, setCopied] = useState(false)

	function handleCopy() {
		navigator.clipboard.writeText(ctaPrimary.label)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const descriptionParts = description.split(descriptionBold)

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="border-t border-zinc-200 px-8 py-16 text-center dark:border-zinc-800 sm:px-16">
					<h2 className="text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-4xl">
						{title}
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">
						{descriptionParts[0]}
						<strong className="font-semibold text-black dark:text-white">{descriptionBold}</strong>
						{descriptionParts[1] || ''}
					</p>
					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<button
							onClick={handleCopy}
							className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 font-mono text-sm text-white transition-colors hover:bg-zinc-800"
						>
							<span>$</span> {ctaPrimary.label}
							<svg
								className="h-4 w-4 text-zinc-300"
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
						<Link
							href={ctaSecondary.url}
							className="text-sm text-body transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
						>
							{ctaSecondary.labelBold
								? (ctaSecondary.label ?? '').replace(ctaSecondary.labelBold, '')
								: ctaSecondary.label}{' '}
							{ctaSecondary.labelBold && (
								<span className="font-semibold text-brand-blue underline underline-offset-4">
									{ctaSecondary.labelBold}
								</span>
							)}
						</Link>
					</div>
				</div>
			</div>
		</section>
	)
}
