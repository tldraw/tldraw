import { CommunitySection } from '@/components/sections/community-section'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { HeroSection } from '@/components/sections/hero-section'
import { ShowcaseSection } from '@/components/sections/showcase-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { WhatsInsideGrid } from '@/components/sections/whats-inside-grid'
import { WhiteboardKitSection } from '@/components/sections/whiteboard-kit-section'
import { WhyTldrawGrid } from '@/components/sections/why-tldraw-grid'
import {
	communityContent,
	finalCtaContent,
	heroContent,
	showcaseContent,
	starterKitsContent,
	testimonialContent,
	whatsInsideContent,
	whiteboardKitContent,
	whyTldrawContent,
} from '@/content/homepage'

export default function HomePage() {
	return (
		<>
			<HeroSection
				title={heroContent.title}
				subtitle={heroContent.subtitle}
				ctaPrimary={heroContent.ctaPrimary}
				ctaSecondary={heroContent.ctaSecondary}
			/>
			<WhyTldrawGrid title={whyTldrawContent.title} items={whyTldrawContent.items} />
			<ShowcaseSection
				title={showcaseContent.title}
				subtitle={showcaseContent.subtitle}
				ctaLabel={showcaseContent.ctaLabel}
				ctaUrl={showcaseContent.ctaUrl}
				items={showcaseContent.items}
			/>
			<WhatsInsideGrid
				title={whatsInsideContent.title}
				subtitle={whatsInsideContent.subtitle}
				items={whatsInsideContent.items}
			/>
			<CommunitySection title={communityContent.title} stats={communityContent.stats} />
			<WhiteboardKitSection
				eyebrow={whiteboardKitContent.eyebrow}
				title={whiteboardKitContent.title}
				description={whiteboardKitContent.description}
				ctaLabel={whiteboardKitContent.ctaLabel}
				ctaUrl={whiteboardKitContent.ctaUrl}
				features={whiteboardKitContent.features}
			/>
			<StarterKitsSection
				title={starterKitsContent.title}
				subtitle={starterKitsContent.subtitle}
				ctaLabel={starterKitsContent.ctaLabel}
				ctaUrl={starterKitsContent.ctaUrl}
				kits={starterKitsContent.kits}
			/>
			<TestimonialFeature
				featured={testimonialContent.featured}
				caseStudies={testimonialContent.caseStudies}
			/>
			<FinalCtaSection
				title={finalCtaContent.title}
				description={finalCtaContent.description}
				descriptionBold={finalCtaContent.descriptionBold}
				ctaPrimary={finalCtaContent.ctaPrimary}
				ctaSecondary={finalCtaContent.ctaSecondary}
			/>
		</>
	)
}
