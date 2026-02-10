import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { PitchYourselfForm } from '@/components/sections/pitch-yourself-form'
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
			<div className="mx-auto max-w-content border-b border-zinc-200 px-4 pb-10 pt-12 dark:border-zinc-800 sm:px-8 sm:pb-14 sm:pt-[72px]">
				<h1 className="text-3xl font-semibold text-black dark:text-white sm:text-5xl">
					{careersContent.hero.title}
				</h1>
				<p className="mt-4 text-sm leading-relaxed text-body dark:text-zinc-400 sm:mt-6">
					{careersContent.hero.description}
				</p>
				{/* Hero image placeholder - replace with actual image */}
				<div className="mt-8 aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800 sm:mt-10" />
			</div>

			{/* Open roles or no roles message */}
			<div className="mx-auto max-w-content px-4 sm:px-8">
				<div className="border-b border-zinc-200 py-10 dark:border-zinc-800 sm:py-14">
					{jobs && jobs.length > 0 ? (
						<div className="space-y-8">
							<h2 className="text-2xl font-semibold text-black dark:text-white sm:text-[32px]">
								Open roles
							</h2>
							{jobs.map((job) => (
								<div
									key={job._id}
									className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
								>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
												{job.title}
											</h3>
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
									{job.description && job.description.length > 0 && (
										<div className="mt-4">
											<RichText value={job.description} />
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm leading-relaxed text-body dark:text-zinc-400">
							{careersContent.noOpenRoles.beforeLink}
							<a
								href={careersContent.noOpenRoles.linkUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="font-semibold text-brand-blue hover:underline dark:text-blue-400"
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

			{shared?.community && (
				<CommunitySection title={shared.community.title} stats={shared.community.stats} />
			)}
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
