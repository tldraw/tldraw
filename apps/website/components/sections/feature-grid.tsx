interface Feature {
	title: string
	description: string
	icon?: string
}

interface FeatureGridProps {
	title?: string
	subtitle?: string
	features: Feature[]
}

export function FeatureGrid({ title, subtitle, features }: FeatureGridProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{(title || subtitle) && (
					<div className="mx-auto max-w-2xl text-center">
						{title && (
							<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">
								{title}
							</h2>
						)}
						{subtitle && <p className="mt-4 text-lg text-body dark:text-zinc-400">{subtitle}</p>}
					</div>
				)}
				<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature) => (
						<div
							key={feature.title}
							className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
						>
							{feature.icon && <div className="mb-4 text-2xl">{feature.icon}</div>}
							<h3 className="text-lg font-semibold text-black dark:text-white">{feature.title}</h3>
							<p className="mt-2 text-sm text-body dark:text-zinc-400">{feature.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
