import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

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
		<Section>
			{(title || subtitle) && (
				<SectionHeading title={title ?? ''} description={subtitle} align="center" />
			)}
			<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{features.map((feature) => (
					<Card key={feature.title}>
						{feature.icon && <div className="mb-4 text-2xl">{feature.icon}</div>}
						<h3 className="text-lg font-semibold text-black dark:text-white">{feature.title}</h3>
						<p className="mt-2 text-sm text-body dark:text-zinc-400">{feature.description}</p>
					</Card>
				))}
			</div>
		</Section>
	)
}
