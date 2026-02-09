import { ShowcaseGallery } from '@/components/sections/showcase-gallery'
import { PageHeader } from '@/components/ui/page-header'
import { getCaseStudies } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Showcase',
	description: 'See what people are building with tldraw.',
}

export default async function ShowcasePage() {
	const caseStudies = await getCaseStudies()

	return (
		<>
			<PageHeader title="Showcase" description="See what people are building with tldraw." />
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{caseStudies?.length > 0 ? (
					<ShowcaseGallery items={caseStudies} />
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">Showcase coming soon.</p>
				)}
			</div>
		</>
	)
}
