import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { CommunityStat, getCommunityStats } from '@/lib/community-stats'

function Sparkline({ data }: { data: number[] }) {
	const width = 300
	const height = 80
	const padding = 2

	const min = Math.min(...data)
	const max = Math.max(...data)
	const range = max - min || 1

	const points = data
		.map((v, i) => {
			const x = padding + (i / (data.length - 1)) * (width - padding * 2)
			const y = height - padding - ((v - min) / range) * (height - padding * 2)
			return `${x},${y}`
		})
		.join(' ')

	const areaPoints = `${padding},${height} ${points} ${width - padding},${height}`

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
			<defs>
				<linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
					<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
				</linearGradient>
			</defs>
			<polygon points={areaPoints} fill="url(#sparkline-fill)" />
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	)
}

function GitHubIcon() {
	return (
		<svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
		</svg>
	)
}

function StarIcon() {
	return (
		<svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
			<path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
		</svg>
	)
}

function XIcon() {
	return (
		<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	)
}

function DiscordIcon() {
	return (
		<svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
			<path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
		</svg>
	)
}

function NpmIcon() {
	return (
		<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
			<path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323h13.837v13.548h-3.464V8.691h-3.46v10.18H5.13z" />
		</svg>
	)
}

function CommunityCard({
	stat,
	className,
	children,
}: {
	stat: CommunityStat
	className?: string
	children?: React.ReactNode
}) {
	return (
		<a
			href={stat.url}
			target="_blank"
			rel="noopener noreferrer"
			className={`flex flex-col rounded-md border border-zinc-200 p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 ${className ?? ''}`}
		>
			{children}
		</a>
	)
}

export async function CommunitySection() {
	const stats = await getCommunityStats()

	const github = stats.find((s) => s.linkText === 'GitHub')!
	const x = stats.find((s) => s.linkText === 'X')!
	const npm = stats.find((s) => s.linkText === 'npm')!
	const discord = stats.find((s) => s.linkText === 'Discord')!

	return (
		<Section className="py-12 sm:py-16">
			<SectionHeading title="Join the community" />
			<div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-5">
				{/* GitHub — left column, full height */}
				<CommunityCard
					stat={github}
					className="row-span-1 items-start justify-center sm:row-span-2"
				>
					<div className="flex items-baseline gap-2">
						<span className="text-4xl font-bold text-black sm:text-5xl dark:text-white">
							{github.value}
						</span>
						<StarIcon />
					</div>
					<p className="text-body mt-3 text-sm dark:text-zinc-400">
						{github.label}{' '}
						<span className="text-brand-blue inline-flex items-center gap-1 font-semibold dark:text-blue-400">
							<GitHubIcon /> {github.linkText}
						</span>
					</p>
				</CommunityCard>

				{/* X — top middle */}
				<CommunityCard stat={x}>
					<span className="text-3xl font-bold text-black sm:text-4xl dark:text-white">
						{x.value}
					</span>
					<p className="text-body mt-2 text-sm dark:text-zinc-400">
						{x.label}{' '}
						<span className="text-brand-blue inline-flex items-center gap-1 font-semibold dark:text-blue-400">
							<XIcon /> {x.linkText}
						</span>
					</p>
				</CommunityCard>

				{/* npm — right column, full height */}
				<CommunityCard
					stat={npm}
					className="row-span-1 justify-between overflow-hidden sm:row-span-2"
				>
					<div>
						<span className="text-3xl font-bold text-black sm:text-4xl dark:text-white">
							{npm.value}
						</span>
						<p className="text-body mt-2 text-sm dark:text-zinc-400">
							{npm.label}{' '}
							<span className="text-brand-blue inline-flex items-center gap-1 font-semibold dark:text-blue-400">
								<NpmIcon /> {npm.linkText}
							</span>
						</p>
					</div>
					{npm.chartData && (
						<div className="mt-4 h-20 text-blue-500 dark:text-blue-400">
							<Sparkline data={npm.chartData} />
						</div>
					)}
				</CommunityCard>

				{/* Discord — bottom middle */}
				<CommunityCard stat={discord}>
					<span className="text-3xl font-bold text-black sm:text-4xl dark:text-white">
						{discord.value}
					</span>
					<p className="text-body mt-2 text-sm dark:text-zinc-400">
						{discord.label}{' '}
						<span className="text-brand-blue inline-flex items-center gap-1 font-semibold dark:text-blue-400">
							<DiscordIcon /> {discord.linkText}
						</span>
					</p>
				</CommunityCard>
			</div>
		</Section>
	)
}
