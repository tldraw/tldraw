import { CommunitySection } from '@/components/sections/community-section'
import { PricingSingle } from '@/components/sections/pricing-single'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { PageHeader } from '@/components/ui/page-header'
import { getPricingPage, getPullQuoteTestimonials, getSharedSections } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Pricing',
	description: 'Simple, transparent pricing for the tldraw SDK.',
}

export default async function PricingPage() {
	const [pricing, shared, pullQuoteTestimonials] = await Promise.all([
		getPricingPage(),
		getSharedSections(),
		getPullQuoteTestimonials(),
	])

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
			<div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
				<hr className="border-zinc-200 dark:border-zinc-800" />
			</div>
			{shared?.testimonialSection && (
				<TestimonialFeature
					testimonials={pullQuoteTestimonials}
					caseStudies={shared.testimonialSection.caseStudies.slice(0, 1)}
				/>
			)}
			<div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
				<hr className="border-zinc-200 dark:border-zinc-800" />
			</div>
			<CommunitySection />
		</>
	)
}
