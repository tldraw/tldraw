import { TeamGrid } from '@/components/sections/team-grid'
import { PageHeader } from '@/components/ui/page-header'
import { getCompanyPage } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Company',
	description: 'Learn about the team behind tldraw.',
}

export default async function CompanyPage() {
	const page = await getCompanyPage()

	return (
		<>
			<PageHeader title={page?.title || 'Company'} description={page?.intro} />
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{page?.mission && (
					<div className="mx-auto mb-16 max-w-3xl">
						<h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Our mission</h2>
						<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{page.mission}</p>
					</div>
				)}
				{page?.values && page.values.length > 0 && (
					<div className="mb-16">
						<h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Our values</h2>
						<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
							{page.values.map((value) => (
								<div key={value.title}>
									<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
										{value.title}
									</h3>
									<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
										{value.description}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
				{page?.team?.length > 0 && (
					<div>
						<h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Our team</h2>
						<TeamGrid members={page.team} />
					</div>
				)}
			</div>
		</>
	)
}
