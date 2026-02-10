import { ChevronRight } from '@/components/ui/chevron-icon'
import Image from 'next/image'
import Link from 'next/link'

interface WhiteboardFeature {
	title: string
	description: string
}

interface WhiteboardKitSectionProps {
	eyebrow: string
	title: string
	description: string
	ctaLabel: string
	ctaUrl: string
	features: WhiteboardFeature[]
}

export function WhiteboardKitSection({
	eyebrow,
	title,
	description,
	ctaLabel,
	ctaUrl,
	features,
}: WhiteboardKitSectionProps) {
	return (
		<section className="bg-zinc-50 py-16 dark:bg-zinc-900 sm:py-24">
			<div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
				<div className="grid gap-12 lg:grid-cols-2 lg:items-start">
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-brand-blue dark:text-blue-400">
							{eyebrow}
						</p>
						<h2 className="mt-4 text-3xl font-semibold tracking-heading text-black dark:text-white sm:text-4xl">
							{title}
						</h2>
						<p className="mt-4 text-lg text-body dark:text-zinc-400">{description}</p>
						<Link
							href={ctaUrl}
							className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-link underline underline-offset-4 hover:text-brand-link/90 dark:hover:text-brand-link/90"
						>
							{ctaLabel} <ChevronRight />
						</Link>
						<div className="mt-10 space-y-6">
							{features.map((feature) => (
								<div key={feature.title}>
									<h3 className="text-base font-semibold text-black dark:text-white">
										{feature.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
										{feature.description}
									</p>
								</div>
							))}
						</div>
					</div>
					<div className="relative aspect-video overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:aspect-[4/3]">
						<Image
							src="/images/whiteboard-kit.png"
							alt="tldraw whiteboard canvas"
							fill
							className="object-cover"
							sizes="(max-width: 1024px) 100vw, 50vw"
						/>
					</div>
				</div>
			</div>
		</section>
	)
}
