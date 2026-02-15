import { Markdown } from '@/components/markdown'
import { PageHeader } from '@/components/ui/page-header'
import { db } from '@/utils/ContentDatabase'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Partner',
	description: 'Partner with tldraw to build the future of creative tools.',
}

export default async function PartnerPage() {
	const page = await db.getPage('/partner')

	return (
		<>
			<PageHeader
				title={page?.title || 'Partner with tldraw'}
				description="Build the future of creative tools together."
			/>
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{page?.content ? (
					<Markdown content={page.content} />
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						Partner information coming soon.
					</p>
				)}
			</div>
		</>
	)
}
