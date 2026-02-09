import { FAQAccordion } from '@/components/sections/faq-accordion'
import { PricingTable } from '@/components/sections/pricing-table'
import { PageHeader } from '@/components/ui/page-header'
import { getPricingPage } from '@/sanity/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Pricing',
	description: 'Simple, transparent pricing for the tldraw SDK.',
}

export default async function PricingPage() {
	const page = await getPricingPage()

	return (
		<>
			<PageHeader
				title={page?.title || 'Pricing'}
				description={page?.subtitle || 'Simple, transparent pricing for teams of all sizes.'}
			/>
			<div className="py-12 sm:py-24">
				{page?.tiers?.length > 0 ? (
					<PricingTable tiers={page.tiers} />
				) : (
					<div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
						<p className="text-zinc-500 dark:text-zinc-400">Pricing information coming soon.</p>
					</div>
				)}
			</div>
			{page?.faqItems && page.faqItems.length > 0 && (
				<div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
					<h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
						Frequently asked questions
					</h2>
					<FAQAccordion items={page.faqItems} />
				</div>
			)}
			{page?.contactCta && (
				<div className="mx-auto max-w-7xl px-4 pb-16 text-center sm:px-6 sm:pb-24 lg:px-8">
					<p className="mb-4 text-lg text-zinc-600 dark:text-zinc-400">Need a custom plan?</p>
					<Link
						href={page.contactCta.url}
						className="inline-flex rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
					>
						{page.contactCta.label}
					</Link>
				</div>
			)}
		</>
	)
}
