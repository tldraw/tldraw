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
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-2xl">
					<p className="text-xs font-semibold uppercase tracking-widest text-brand-blue dark:text-brand-blue">
						{eyebrow}
					</p>
					<h2 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-4xl">
						{title}
					</h2>
					<p className="mt-4 text-lg text-body dark:text-zinc-400">{description}</p>
					<Link
						href={ctaUrl}
						className="mt-6 inline-block text-sm font-medium text-brand-blue underline underline-offset-4 hover:text-blue-700 dark:text-brand-blue dark:hover:text-blue-400"
					>
						{ctaLabel} &rarr;
					</Link>
				</div>
				<div className="mx-auto mt-12 grid max-w-2xl gap-8 sm:grid-cols-3">
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
		</section>
	)
}
