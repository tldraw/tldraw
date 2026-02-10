import { ActionLink } from '@/components/ui/action-link'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import Image from 'next/image'

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
		<Section bg="muted">
			<div className="grid gap-12 lg:grid-cols-2 lg:items-start">
				<div>
					<SectionHeading title={title} description={description} eyebrow={eyebrow} />
					<ActionLink href={ctaUrl} underline className="mt-6">
						{ctaLabel}
					</ActionLink>
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
		</Section>
	)
}
