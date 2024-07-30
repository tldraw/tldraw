import { Section } from './section'
import { SectionHeading } from './section-heading'

export const PricingSection = () => {
	return (
		<div id="pricing" className="bg-zinc-50 mt-16 sm:mt-24 md:mt-32 lg:mt-40">
			<Section className="pb-16 sm:pb-24 md:pb-32 lg:pb-40">
				<SectionHeading
					subheading="Pricing"
					heading="Free for Personal Use"
					description="This section is a work in progress..."
				/>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-5"></div>
			</Section>
		</div>
	)
}
