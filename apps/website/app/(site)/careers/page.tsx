import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { PitchYourselfForm } from '@/components/sections/pitch-yourself-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { careersContent } from '@/content/careers'
import { getJobListings, getSharedSections } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Careers',
	description: 'Join the tldraw team and help build the future of creative tools.',
}

export default async function CareersPage() {
	const [jobs, shared] = await Promise.all([getJobListings(), getSharedSections()])

	return (
		<>
			{/* Page header - matches FAQ layout */}
			<div className="max-w-content mx-auto border-b border-zinc-200 px-4 pt-12 pb-10 sm:px-8 sm:pt-[72px] sm:pb-14 dark:border-zinc-800">
				<h1 className="text-3xl font-semibold text-black sm:text-5xl dark:text-white">
					{careersContent.hero.title}
				</h1>
				<p className="text-body mt-4 text-sm leading-relaxed sm:mt-6 dark:text-zinc-400">
					{careersContent.hero.description}
				</p>
				{/* Hero image placeholder - replace with actual image */}
				<div className="mt-8 aspect-4/3 w-full overflow-hidden rounded-md bg-zinc-200 sm:mt-10 dark:bg-zinc-800" />
			</div>

			{/* Open roles or no roles message */}
			<div className="max-w-content mx-auto px-4 sm:px-8">
				<div className="border-b border-zinc-200 py-10 sm:py-14 dark:border-zinc-800">
					{jobs && jobs.length > 0 ? (
						<div className="space-y-8">
							<h2 className="text-2xl font-semibold text-black sm:text-[32px] dark:text-white">
								Open roles
							</h2>
							{jobs.map((job) => (
								<Card key={job._id}>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
												{job.title}
											</h3>
											<div className="mt-2 flex flex-wrap gap-2">
												<Badge>{job.department}</Badge>
												<Badge>{job.location}</Badge>
												<Badge>{job.type}</Badge>
											</div>
										</div>
										<Button href={job.applyUrl} className="px-4 py-2">
											Apply
										</Button>
									</div>
									{job.description && job.description.length > 0 && (
										<div className="mt-4">
											<RichText value={job.description} />
										</div>
									)}
								</Card>
							))}
						</div>
					) : (
						<p className="text-body text-sm leading-relaxed dark:text-zinc-400">
							{careersContent.noOpenRoles.beforeLink}
							<a
								href={careersContent.noOpenRoles.linkUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-brand-blue font-semibold hover:underline dark:text-blue-400"
							>
								{careersContent.noOpenRoles.linkText}
							</a>
							{careersContent.noOpenRoles.afterLink}
						</p>
					)}
				</div>

				{/* Pitch yourself - two-column layout like FAQ */}
				<PitchYourselfForm
					title={careersContent.pitchYourself.title}
					description={careersContent.pitchYourself.description}
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
