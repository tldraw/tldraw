import { RichText } from '@/components/portable-text'
import { PageHeader } from '@/components/ui/page-header'
import { getJobListings } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Careers',
	description: 'Join the tldraw team and help build the future of creative tools.',
}

export default async function CareersPage() {
	const jobs = await getJobListings()

	return (
		<>
			<PageHeader
				title="Careers"
				description="Join the tldraw team and help build the future of creative tools."
			/>
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{jobs?.length > 0 ? (
					<div className="space-y-8">
						{jobs.map((job) => (
							<div
								key={job._id}
								className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
							>
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
											{job.title}
										</h2>
										<div className="mt-2 flex flex-wrap gap-2">
											<span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
												{job.department}
											</span>
											<span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
												{job.location}
											</span>
											<span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
												{job.type}
											</span>
										</div>
									</div>
									<a
										href={job.applyUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
									>
										Apply
									</a>
								</div>
								{job.description && (
									<div className="mt-4">
										<RichText value={job.description} />
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						No open positions right now. Check back soon or follow us on Twitter for updates.
					</p>
				)}
			</div>
		</>
	)
}
