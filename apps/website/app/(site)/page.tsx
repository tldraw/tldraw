import { CommunitySection } from '@/components/sections/community-section'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { HeroSection } from '@/components/sections/hero-section'
import { ShowcaseSection } from '@/components/sections/showcase-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { WhatsInsideGrid } from '@/components/sections/whats-inside-grid'
import { WhiteboardKitSection } from '@/components/sections/whiteboard-kit-section'
import { WhyTldrawGrid } from '@/components/sections/why-tldraw-grid'
import { getHomepage } from '@/sanity/queries'

export default async function HomePage() {
	const hp = await getHomepage()
	if (!hp) return null

	return (
		<>
			{hp.hero && (
				<HeroSection
					title={hp.hero.title}
					subtitle={hp.hero.subtitle}
					ctaPrimary={hp.hero.ctaPrimary}
					ctaSecondary={hp.hero.ctaSecondary}
				/>
			)}
			{hp.whyTldraw && <WhyTldrawGrid title={hp.whyTldraw.title} items={hp.whyTldraw.items} />}
			{hp.showcaseSection && (
				<ShowcaseSection
					title={hp.showcaseSection.title}
					subtitle={hp.showcaseSection.subtitle}
					ctaLabel={hp.showcaseSection.ctaLabel}
					ctaUrl={hp.showcaseSection.ctaUrl}
					items={hp.showcaseSection.items}
				/>
			)}
			{hp.whatsInside && (
				<WhatsInsideGrid
					title={hp.whatsInside.title}
					subtitle={hp.whatsInside.subtitle}
					items={hp.whatsInside.items}
				/>
			)}
			{hp.community && <CommunitySection title={hp.community.title} stats={hp.community.stats} />}
			{hp.whiteboardKit && (
				<WhiteboardKitSection
					eyebrow={hp.whiteboardKit.eyebrow}
					title={hp.whiteboardKit.title}
					description={hp.whiteboardKit.description}
					ctaLabel={hp.whiteboardKit.ctaLabel}
					ctaUrl={hp.whiteboardKit.ctaUrl}
					features={hp.whiteboardKit.features}
				/>
			)}
			{hp.starterKits && (
				<StarterKitsSection
					title={hp.starterKits.title}
					subtitle={hp.starterKits.subtitle}
					ctaLabel={hp.starterKits.ctaLabel}
					ctaUrl={hp.starterKits.ctaUrl}
					kits={hp.starterKits.kits}
				/>
			)}
			{hp.testimonialSection && (
				<TestimonialFeature
					featured={hp.testimonialSection.featured}
					caseStudies={hp.testimonialSection.caseStudies}
				/>
			)}
			{hp.finalCta && (
				<FinalCtaSection
					title={hp.finalCta.title}
					description={hp.finalCta.description}
					descriptionBold={hp.finalCta.descriptionBold}
					ctaPrimary={hp.finalCta.ctaPrimary}
					ctaSecondary={hp.finalCta.ctaSecondary}
				/>
			)}
		</>
	)
}
