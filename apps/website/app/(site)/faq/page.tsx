import { FAQAccordion } from '@/components/sections/faq-accordion'
import { PageHeader } from '@/components/ui/page-header'
import { getFaqItems } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'FAQ',
	description: 'Frequently asked questions about tldraw and the tldraw SDK.',
}

export default async function FAQPage() {
	const items = await getFaqItems()

	return (
		<>
			<PageHeader
				title="Frequently asked questions"
				description="Everything you need to know about tldraw."
			/>
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{items?.length > 0 ? (
					<FAQAccordion items={items} />
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">FAQ coming soon.</p>
				)}
			</div>
		</>
	)
}
