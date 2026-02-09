import { RichText } from '@/components/portable-text'
import { PageHeader } from '@/components/ui/page-header'
import { getPage } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Partner',
	description: 'Partner with tldraw to build the future of creative tools.',
}

export default async function PartnerPage() {
	const page = await getPage('partner')

	return (
		<>
			<PageHeader
				title={page?.title || 'Partner with tldraw'}
				description="Build the future of creative tools together."
			/>
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{page?.body ? (
					<RichText value={page.body} />
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						Partner information coming soon.
					</p>
				)}
			</div>
		</>
	)
}
