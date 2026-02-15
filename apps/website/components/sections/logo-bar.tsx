import Image from 'next/image'

interface LogoBarEntry {
	_key: string
	name: string
	logo?: string
}

interface LogoBarProps {
	entries: LogoBarEntry[]
}

function LogoItems({ entries, keyPrefix }: { entries: LogoBarEntry[]; keyPrefix: string }) {
	return (
		<>
			{entries.map((entry) => (
				<Image
					key={`${keyPrefix}-${entry.name}`}
					src={entry.logo!}
					alt={entry.name}
					width={100}
					height={20}
					className="flex h-5 w-[140px] shrink-0 items-center justify-center opacity-90 grayscale"
				/>
			))}
		</>
	)
}

export function LogoBar({ entries }: LogoBarProps) {
	const logosWithImages = entries.filter((e) => !!e.logo)
	if (logosWithImages.length === 0) return null

	return (
		<div className="border-b border-zinc-200 pt-12 pb-16 dark:border-zinc-800">
			<div className="max-w-content relative mx-auto overflow-hidden px-4 sm:px-6 lg:px-8">
				{/* Gradient masks for fade at edges */}
				<div
					className="pointer-events-none absolute top-0 left-0 z-10 h-full w-16 bg-linear-to-r from-white to-transparent dark:from-zinc-950"
					aria-hidden
				/>
				<div
					className="pointer-events-none absolute top-0 right-0 z-10 h-full w-16 bg-linear-to-l from-white to-transparent dark:from-zinc-950"
					aria-hidden
				/>
				{/* Marquee: two identical copies, animate track -50% for seamless loop (no gap between copies) */}
				<div className="logo-bar-marquee flex overflow-hidden select-none">
					<div className="logo-bar-marquee__track flex shrink-0">
						<div
							className="flex flex-row items-center"
							style={{ width: logosWithImages.length * 140 }}
						>
							<LogoItems entries={logosWithImages} keyPrefix="a" />
						</div>
						<div
							className="flex flex-row items-center"
							style={{ width: logosWithImages.length * 140 }}
						>
							<LogoItems entries={logosWithImages} keyPrefix="b" />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
