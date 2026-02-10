import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { getCommunityStats } from '@/lib/community-stats'

export async function CommunitySection() {
	const stats = await getCommunityStats()

	return (
		<Section className="py-12 sm:py-16">
			<SectionHeading title="Join the community" />
			<div className="mt-8 grid grid-cols-2 items-start gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-4">
				{stats.map((stat) => (
					<a
						key={stat.linkText}
						href={stat.url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex flex-col items-start rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
					>
						<div className="flex items-baseline gap-1.5">
							<span className="text-3xl font-bold text-black dark:text-white sm:text-4xl">
								{stat.value}
							</span>
							{stat.linkText.toLowerCase() === 'github' && (
								<svg
									className="h-5 w-5 text-zinc-400 dark:text-zinc-500"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
									/>
								</svg>
							)}
						</div>
						<p className="mt-2 text-xs text-body dark:text-zinc-400 sm:text-sm">
							{stat.label}{' '}
							<span className="font-semibold text-brand-blue dark:text-blue-400">
								{stat.linkText}
							</span>
						</p>
					</a>
				))}
			</div>
		</Section>
	)
}
