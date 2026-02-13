import { CommunitySection } from '@/components/sections/community-section'
import { PricingSingle } from '@/components/sections/pricing-single'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { PageHeader } from '@/components/ui/page-header'
import { db } from '@/utils/ContentDatabase'
import { getTestimonials } from '@/utils/collections'
import { getSharedSections } from '@/utils/shared-sections'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Pricing',
	description: 'Simple, transparent pricing for the tldraw SDK.',
}

export default async function PricingPage() {
	const [page, shared, pullQuoteTestimonials] = await Promise.all([
		db.getPage('/pricing'),
		getSharedSections(),
		getTestimonials('pull-quote'),
	])

	const meta = page?.metadata ? JSON.parse(page.metadata) : {}

	const testimonials = pullQuoteTestimonials.map((t) => ({
		quote: t.data.quote,
		author: t.data.author,
		role: t.data.role,
		company: t.data.company,
		avatar: t.data.avatar,
	}))

	return (
		<>
			<PageHeader title={meta.title ?? page?.title ?? ''} description={meta.subtitle ?? ''} />
			<div className="pb-12 sm:pb-24">
				{meta.sdkLicense && (
					<PricingSingle
						title={meta.sdkLicense.title}
						description={meta.sdkLicense.description}
						features={meta.sdkLicense.features}
						ctaPrimary={meta.sdkLicense.ctaPrimary}
						ctaSecondary={meta.sdkLicense.ctaSecondary}
						premiumNote={meta.premiumNote}
						startup={meta.startupCard ?? { title: '', description: '', ctaLabel: '', ctaUrl: '' }}
						hobby={meta.hobbyCard ?? { description: '', ctaLabel: '', ctaUrl: '' }}
					/>
				)}
			</div>
			<div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
				<hr className="border-zinc-200 dark:border-zinc-800" />
			</div>
			{shared?.testimonialSection && (
				<TestimonialFeature
					testimonials={testimonials}
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
