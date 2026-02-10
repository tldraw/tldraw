import Image from 'next/image'
import Link from 'next/link'

interface ShowcaseItem {
	company: string
	category: string
	description: string
	url: string
	image?: string
}

const SHOWCASE_IMAGE_MAP: Record<string, string> = {
	ClickUp: '/images/showcase/clickup.png',
	Padlet: '/images/showcase/padlet.png',
	Mobbin: '/images/showcase/mobbin.png',
	Jam: '/images/showcase/jam.png',
}

interface ShowcaseSectionProps {
	title: string
	subtitle: string
	ctaLabel: string
	ctaUrl: string
	items: ShowcaseItem[]
}

export function ShowcaseSection({
	title,
	subtitle,
	ctaLabel,
	ctaUrl,
	items,
}: ShowcaseSectionProps) {
	return (
		<section className="bg-zinc-50 py-16 dark:bg-zinc-900 sm:py-24">
			<div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">
							{title}
						</h2>
						<p className="mt-4 text-lg text-body dark:text-zinc-400">{subtitle}</p>
					</div>
					<Link
						href={ctaUrl}
						className="text-sm font-medium text-brand-blue underline underline-offset-4 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
					>
						{ctaLabel} &rarr;
					</Link>
				</div>
				<div className="mt-12 grid gap-6 sm:grid-cols-2">
					{items.map((item) => (
						<div
							key={item.company}
							className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
						>
							<div className="relative aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-900">
								{(item.image ?? SHOWCASE_IMAGE_MAP[item.company]) ? (
									<Image
										src={item.image ?? SHOWCASE_IMAGE_MAP[item.company]!}
										alt={item.company}
										fill
										className="object-cover"
										sizes="(max-width: 640px) 100vw, 50vw"
									/>
								) : (
									<span className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
										{item.company} image placeholder
									</span>
								)}
							</div>
							<div className="flex flex-1 flex-col p-6">
								<h3 className="text-lg font-semibold text-black dark:text-white">{item.company}</h3>
								<span className="mt-1 text-xs font-medium text-body dark:text-zinc-400">
									{item.category}
								</span>
								<p className="mt-4 flex-1 text-sm leading-relaxed text-body dark:text-zinc-400">
									{item.description}
								</p>
								<Link
									href={item.url}
									className="mt-4 text-sm font-medium text-brand-blue underline underline-offset-4 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
								>
									Read case study &rarr;
								</Link>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
