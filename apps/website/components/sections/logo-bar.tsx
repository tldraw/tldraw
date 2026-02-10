import { urlFor } from '@/sanity/image'
import type { SanityImage } from '@/sanity/types'
import Image from 'next/image'

interface LogoBarEntry {
	name: string
	logo?: SanityImage
}

interface LogoBarProps {
	entries: LogoBarEntry[]
}

export function LogoBar({ entries }: LogoBarProps) {
	const logosWithImages = entries.filter((e) => e.logo)
	if (logosWithImages.length === 0) return null

	return (
		<div className="border-b border-zinc-200 py-8 dark:border-zinc-800">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-16">
					{logosWithImages.map((entry) => (
						<Image
							key={entry.name}
							src={urlFor(entry.logo!).height(28).url()}
							alt={entry.name}
							width={120}
							height={28}
							className="h-6 w-auto opacity-60 grayscale transition-opacity hover:opacity-100 sm:h-7"
						/>
					))}
				</div>
			</div>
		</div>
	)
}

/** Fallback logo bar using placeholder text when no Sanity images are available */
export function LogoBarPlaceholder({ names }: { names: string[] }) {
	return (
		<div className="border-b border-zinc-200 py-8 dark:border-zinc-800">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-16">
					{names.map((name) => (
						<span
							key={name}
							className="text-sm font-semibold text-zinc-400 dark:text-zinc-500"
						>
							{name}
						</span>
					))}
				</div>
			</div>
		</div>
	)
}
