'use client'

import { CodeCopyButton } from '@/components/ui/code-copy-button'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import Link from 'next/link'

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
	const descriptionParts = description.split(descriptionBold)

	return (
		<Section>
			<div className="border-t border-zinc-200 py-16 text-left dark:border-zinc-800">
				<SectionHeading title={title} />
				<p className="mt-4 max-w-2xl dark:text-zinc-400">
					{descriptionParts[0]}
					<strong className="font-semibold text-black dark:text-white">{descriptionBold}</strong>
					{descriptionParts[1] || ''}
				</p>
				<div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-4">
					<CodeCopyButton code={ctaPrimary.label} className="dark:hover:bg-zinc-800">
						{ctaPrimary.label}
					</CodeCopyButton>
					{ctaSecondary.labelBold &&
						(ctaSecondary.label ?? '').replace(ctaSecondary.labelBold, '').trimEnd() && (
							<span className="text-body dark:text-zinc-400">
								{(ctaSecondary.label ?? '').replace(ctaSecondary.labelBold!, '').trimEnd()}{' '}
							</span>
						)}
					<Link
						href={ctaSecondary.url}
						className="font-medium text-brand-blue transition-colors hover:text-brand-blue/80"
					>
						{ctaSecondary.labelBold ?? ctaSecondary.label} →
					</Link>
				</div>
			</div>
		</Section>
	)
}
