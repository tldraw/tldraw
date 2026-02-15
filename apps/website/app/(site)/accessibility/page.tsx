import { Markdown } from '@/components/markdown'
import { PageHeader } from '@/components/ui/page-header'
import { db } from '@/utils/ContentDatabase'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Accessibility',
	description: 'Our commitment to making tldraw accessible to everyone.',
}

export default async function AccessibilityPage() {
	const page = await db.getPage('/accessibility')

	return (
		<>
			<PageHeader
				title={page?.title || 'Accessibility'}
				description="Our commitment to making tldraw accessible to everyone."
			/>
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{page?.content ? (
					<Markdown content={page.content} />
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						Accessibility statement coming soon.
					</p>
				)}
			</div>
		</>
	)
}
