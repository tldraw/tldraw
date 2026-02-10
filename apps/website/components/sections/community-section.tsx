interface CommunityStat {
	value: string
	label: string
	linkText: string
	url: string
}

interface CommunitySectionProps {
	title: string
	stats: CommunityStat[]
}

export function CommunitySection({ title, stats }: CommunitySectionProps) {
	const [featured, ...rest] = stats

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">{title}</h2>
				<div className="mt-12 grid gap-6 lg:grid-cols-[1fr_2fr]">
					{/* Featured stat */}
					{featured && (
						<a
							href={featured.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex flex-col justify-center rounded-xl border border-zinc-200 p-8 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
						>
							<div className="flex items-baseline gap-2">
								<span className="text-5xl font-bold text-black dark:text-white">
									{featured.value}
								</span>
								<svg
									className="h-6 w-6 text-zinc-400 dark:text-zinc-500"
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
							</div>
							<p className="mt-3 text-sm text-body dark:text-zinc-400">
								{featured.label}{' '}
								<span className="font-semibold text-brand-blue dark:text-blue-400">
									{featured.linkText}
								</span>
							</p>
						</a>
					)}

					{/* Other stats in grid */}
					<div className="grid grid-cols-2 gap-6">
						{rest.map((stat) => {
							const isNpm = stat.linkText.toLowerCase() === 'npm'
							return (
								<a
									key={stat.linkText}
									href={stat.url}
									target="_blank"
									rel="noopener noreferrer"
									className="relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
								>
									<span className="text-2xl font-bold text-black dark:text-white">
										{stat.value}
									</span>
									<p className="mt-1 text-sm text-body dark:text-zinc-400">
										{stat.label}{' '}
										<span className="font-semibold text-brand-blue dark:text-blue-400">
											{stat.linkText}
										</span>
									</p>
									{isNpm && (
										<svg
											className="mt-3 h-10 w-full text-brand-blue"
											viewBox="0 0 200 40"
											fill="none"
											preserveAspectRatio="none"
										>
											<path
												d="M0 35 Q20 32 40 28 T80 22 T120 18 T160 10 T200 5"
												stroke="currentColor"
												strokeWidth="2"
												fill="none"
											/>
										</svg>
									)}
								</a>
							)
						})}
					</div>
				</div>
			</div>
		</section>
	)
}
