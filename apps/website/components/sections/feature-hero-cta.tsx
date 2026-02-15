'use client'

import { ChevronRight } from '@/components/ui/chevron-icon'
import { CodeCopyButton } from '@/components/ui/code-copy-button'
import Link from 'next/link'

interface FeatureHeroCtaProps {
	ctaPrimary: { label: string; url: string; variant?: string }
	ctaSecondary?: { label?: string; labelBold?: string; url: string }
}

export function FeatureHeroCta({ ctaPrimary, ctaSecondary }: FeatureHeroCtaProps) {
	return (
		<div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
			{ctaPrimary.variant === 'code' ? (
				<CodeCopyButton
					code={ctaPrimary.label}
					className="dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
				/>
			) : (
				<Link
					href={ctaPrimary.url}
					className="rounded-md bg-black px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					{ctaPrimary.label}
				</Link>
			)}
			{ctaSecondary && (
				<Link
					href={ctaSecondary.url}
					className="text-body inline-flex items-center gap-1.5 text-sm transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
				>
					{ctaSecondary.labelBold ? (
						<>
							or{' '}
							<span className="text-brand-blue font-semibold underline underline-offset-4">
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
	)
}
