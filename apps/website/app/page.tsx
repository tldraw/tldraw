import { CTASection } from '@/components/sections/cta-section'
import { FeatureGrid } from '@/components/sections/feature-grid'
import { HeroSection } from '@/components/sections/hero-section'
import { TestimonialCarousel } from '@/components/sections/testimonial-carousel'
import { getHomepage } from '@/sanity/queries'

export default async function HomePage() {
	const homepage = await getHomepage()

	if (!homepage) {
		return (
			<HeroSection
				title="The infinite canvas SDK for React"
				subtitle="Build whiteboards, design tools, and creative applications with tldraw's powerful, extensible canvas engine."
				ctaPrimary={{ label: 'Get started', url: '/quick-start' }}
				ctaSecondary={{ label: 'View pricing', url: '/pricing' }}
			/>
		)
	}

	return (
		<>
			<HeroSection
				title={homepage.hero.title}
				subtitle={homepage.hero.subtitle}
				ctaPrimary={homepage.hero.ctaPrimary}
				ctaSecondary={homepage.hero.ctaSecondary}
			/>
			{homepage.features?.length > 0 && <FeatureGrid features={homepage.features} />}
			{homepage.testimonials?.length > 0 && (
				<TestimonialCarousel title="Trusted by developers" testimonials={homepage.testimonials} />
			)}
			{homepage.ctaSection && (
				<CTASection
					title={homepage.ctaSection.title}
					description={homepage.ctaSection.description}
					cta={homepage.ctaSection.cta}
				/>
			)}
		</>
	)
}
