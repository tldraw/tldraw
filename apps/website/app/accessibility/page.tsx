import { RichText } from '@/components/portable-text'
import { PageHeader } from '@/components/ui/page-header'
import { getPage } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Accessibility',
	description: 'Our commitment to making tldraw accessible to everyone.',
}

export default async function AccessibilityPage() {
	const page = await getPage('accessibility')

	return (
		<>
			<PageHeader
				title={page?.title || 'Accessibility'}
				description="Our commitment to making tldraw accessible to everyone."
			/>
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{page?.body ? (
					<RichText value={page.body} />
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						Accessibility statement coming soon.
					</p>
				)}
			</div>
		</>
	)
}
