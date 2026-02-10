import { CommunitySection } from '@/components/sections/community-section'
import { PricingSingle } from '@/components/sections/pricing-single'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { PageHeader } from '@/components/ui/page-header'
import { getPricingPage, getSharedSections } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Pricing',
	description: 'Simple, transparent pricing for the tldraw SDK.',
}

export default async function PricingPage() {
	const [pricing, shared] = await Promise.all([getPricingPage(), getSharedSections()])

	return (
		<>
			<PageHeader title={pricing?.title ?? ''} description={pricing?.subtitle ?? ''} />
			<div className="pb-12 sm:pb-24">
				{pricing?.sdkLicense && (
					<PricingSingle
						title={pricing.sdkLicense.title}
						description={pricing.sdkLicense.description}
						features={pricing.sdkLicense.features}
						ctaPrimary={pricing.sdkLicense.ctaPrimary}
						ctaSecondary={pricing.sdkLicense.ctaSecondary}
						premiumNote={pricing.premiumNote}
						startup={
							pricing.startupCard ?? { title: '', description: '', ctaLabel: '', ctaUrl: '' }
						}
						hobby={pricing.hobbyCard ?? { description: '', ctaLabel: '', ctaUrl: '' }}
					/>
				)}
			</div>
			{shared?.testimonialSection && (
				<TestimonialFeature
					featured={shared.testimonialSection.featured}
					caseStudies={shared.testimonialSection.caseStudies.slice(0, 1)}
				/>
			)}
			{shared?.community && (
				<CommunitySection title={shared.community.title} stats={shared.community.stats} />
			)}
		</>
	)
}
