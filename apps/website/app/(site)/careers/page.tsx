import { Markdown } from '@/components/markdown'
import { CommunitySection } from '@/components/sections/community-section'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { PitchYourselfForm } from '@/components/sections/pitch-yourself-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { db } from '@/utils/ContentDatabase'
import { getJobListings } from '@/utils/collections'
import { getSharedSections } from '@/utils/shared-sections'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Careers',
	description: 'Join the tldraw team and help build the future of creative tools.',
}

export default async function CareersPage() {
	const [jobs, shared, page] = await Promise.all([
		getJobListings(),
		getSharedSections(),
		db.getPage('/careers'),
	])

	const meta = page?.metadata ? JSON.parse(page.metadata) : {}

	return (
		<>
			<div className="max-w-content mx-auto border-b border-zinc-200 px-4 pt-12 pb-10 sm:px-8 sm:pt-[72px] sm:pb-14 dark:border-zinc-800">
				<h1 className="text-3xl font-semibold text-black sm:text-5xl dark:text-white">
					{page?.title ?? 'Careers'}
				</h1>
				<p className="text-body mt-4 text-sm leading-relaxed sm:mt-6 dark:text-zinc-400">
					{page?.description ?? 'Join the tldraw team and help build the future of creative tools.'}
				</p>
				<div className="mt-8 aspect-4/3 w-full overflow-hidden rounded-md bg-zinc-200 sm:mt-10 dark:bg-zinc-800" />
			</div>

			<div className="max-w-content mx-auto px-4 sm:px-8">
				<div className="border-b border-zinc-200 py-10 sm:py-14 dark:border-zinc-800">
					{jobs.length > 0 ? (
						<div className="space-y-8">
							<h2 className="text-2xl font-semibold text-black sm:text-[32px] dark:text-white">
								Open roles
							</h2>
							{jobs.map((job) => (
								<Card key={job.id}>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
												{job.data.title}
											</h3>
											<div className="mt-2 flex flex-wrap gap-2">
												<Badge>{job.data.department}</Badge>
												<Badge>{job.data.location}</Badge>
												<Badge>{job.data.type}</Badge>
											</div>
										</div>
										<Button href={job.data.applyUrl} className="px-4 py-2">
											Apply
										</Button>
									</div>
									{job.content && (
										<div className="mt-4">
											<Markdown content={job.content} />
										</div>
									)}
								</Card>
							))}
						</div>
					) : (
						<p className="text-body text-sm leading-relaxed dark:text-zinc-400">
							{meta.noOpenRolesMessage ?? 'No open roles right now. Check back soon!'}
						</p>
					)}
				</div>

				<PitchYourselfForm
					title={meta.pitchYourselfTitle ?? 'Pitch yourself'}
					description={
						meta.pitchYourselfDescription ?? "Don't see a role that fits? Tell us about yourself."
					}
				/>
			</div>

			<CommunitySection />
			{shared?.finalCta && (
				<FinalCtaSection
					title={shared.finalCta.title}
					description={shared.finalCta.description}
					descriptionBold={shared.finalCta.descriptionBold}
					ctaPrimary={shared.finalCta.ctaPrimary}
					ctaSecondary={shared.finalCta.ctaSecondary}
				/>
			)}
		</>
	)
}
