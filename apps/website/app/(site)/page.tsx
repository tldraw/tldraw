import { CommunitySection } from '@/components/sections/community-section'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { HeroDemoClient } from '@/components/sections/hero-demo-client'
import { HeroSection } from '@/components/sections/hero-section'
import { LogoBarPlaceholder } from '@/components/sections/logo-bar'
import { ShowcaseSection } from '@/components/sections/showcase-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { WhatsInsideGrid } from '@/components/sections/whats-inside-grid'
import { WhiteboardKitSection } from '@/components/sections/whiteboard-kit-section'
import { WhyTldrawGrid } from '@/components/sections/why-tldraw-grid'
import {
	finalCtaContent,
	heroContent,
	heroLogoBarNames,
	showcaseContent,
	starterKitsContent,
	testimonialContent,
	whatsInsideContent,
	whiteboardKitContent,
	whyTldrawContent,
} from '@/content/homepage'
import { heroDemoCodeSnippet } from '@/lib/hero-demo-code'
import { getHomepage, getPullQuoteTestimonials } from '@/sanity/queries'
import { codeToHtml } from 'shiki'

function toHomepageSection<T>(items: T[]): (T & { _key: string })[] {
	return items.map((item, i) => ({ ...item, _key: `item-${i}` }))
}

export default async function HomePage() {
	const [hp, pullQuoteTestimonials] = await Promise.all([getHomepage(), getPullQuoteTestimonials()])
	const data = hp ?? {
		_id: 'homepage',
		_type: 'homepage' as const,
		hero: {
			title: heroContent.title,
			subtitle: heroContent.subtitle,
			subtitleHighlight: heroContent.subtitleHighlight,
			ctaPrimary: heroContent.ctaPrimary,
			ctaSecondary: heroContent.ctaSecondary,
		},
		whyTldraw: {
			title: whyTldrawContent.title,
			items: toHomepageSection(whyTldrawContent.items),
		},
		showcaseSection: {
			title: showcaseContent.title,
			subtitle: showcaseContent.subtitle,
			ctaLabel: showcaseContent.ctaLabel,
			ctaUrl: showcaseContent.ctaUrl,
			items: showcaseContent.items,
		},
		whatsInside: {
			title: whatsInsideContent.title,
			subtitle: whatsInsideContent.subtitle,
			items: toHomepageSection(whatsInsideContent.items),
		},
		whiteboardKit: {
			eyebrow: whiteboardKitContent.eyebrow,
			title: whiteboardKitContent.title,
			description: whiteboardKitContent.description,
			ctaLabel: whiteboardKitContent.ctaLabel,
			ctaUrl: whiteboardKitContent.ctaUrl,
			features: toHomepageSection(whiteboardKitContent.features),
		},
		starterKits: {
			title: starterKitsContent.title,
			subtitle: starterKitsContent.subtitle,
			ctaLabel: starterKitsContent.ctaLabel,
			ctaUrl: starterKitsContent.ctaUrl,
			kits: toHomepageSection(starterKitsContent.kits),
		},
		testimonialSection: {
			caseStudies: testimonialContent.caseStudies,
		},
		finalCta: {
			title: finalCtaContent.title,
			description: finalCtaContent.description,
			descriptionBold: finalCtaContent.descriptionBold,
			ctaPrimary: finalCtaContent.ctaPrimary,
			ctaSecondary: finalCtaContent.ctaSecondary,
		},
	}

	const [heroCodeHtml, heroDemoCodeHtml] = await Promise.all([
		data.hero?.ctaPrimary?.variant === 'code'
			? codeToHtml(`$ ${data.hero.ctaPrimary.label}`, {
					lang: 'bash',
					themes: { light: 'github-light', dark: 'github-dark' },
				})
			: Promise.resolve(undefined),
		codeToHtml(heroDemoCodeSnippet, {
			lang: 'tsx',
			themes: { light: 'github-light', dark: 'github-dark' },
		}),
	])

	return (
		<>
			{data.hero && (
				<>
					<HeroSection
						title={data.hero.title}
						subtitle={data.hero.subtitle}
						subtitleHighlight={data.hero.subtitleHighlight}
						ctaPrimary={data.hero.ctaPrimary}
						ctaSecondary={data.hero.ctaSecondary}
						heroImage={<HeroDemoClient codeHtml={heroDemoCodeHtml} />}
						codeHtml={heroCodeHtml}
					/>
					<LogoBarPlaceholder names={heroLogoBarNames} />
				</>
			)}
			{data.whyTldraw && (
				<WhyTldrawGrid title={data.whyTldraw.title} items={data.whyTldraw.items} />
			)}
			{data.showcaseSection && (
				<ShowcaseSection
					title={data.showcaseSection.title}
					subtitle={data.showcaseSection.subtitle}
					ctaLabel={data.showcaseSection.ctaLabel}
					ctaUrl={data.showcaseSection.ctaUrl}
					items={data.showcaseSection.items}
				/>
			)}
			{data.whatsInside && (
				<WhatsInsideGrid
					title={data.whatsInside.title}
					subtitle={data.whatsInside.subtitle}
					items={data.whatsInside.items}
				/>
			)}
			<CommunitySection />
			{data.whiteboardKit && (
				<WhiteboardKitSection
					eyebrow={data.whiteboardKit.eyebrow}
					title={data.whiteboardKit.title}
					description={data.whiteboardKit.description}
					ctaLabel={data.whiteboardKit.ctaLabel}
					ctaUrl={data.whiteboardKit.ctaUrl}
					features={data.whiteboardKit.features}
				/>
			)}
			{data.starterKits && (
				<StarterKitsSection
					title={data.starterKits.title}
					subtitle={data.starterKits.subtitle}
					ctaLabel={data.starterKits.ctaLabel}
					ctaUrl={data.starterKits.ctaUrl}
					kits={data.starterKits.kits}
				/>
			)}
			{data.testimonialSection && (
				<TestimonialFeature
					testimonials={
						pullQuoteTestimonials.length > 0 ? pullQuoteTestimonials : [testimonialContent.featured]
					}
					caseStudies={data.testimonialSection.caseStudies}
				/>
			)}
			{data.finalCta && (
				<FinalCtaSection
					title={data.finalCta.title}
					description={data.finalCta.description}
					descriptionBold={data.finalCta.descriptionBold}
					ctaPrimary={data.finalCta.ctaPrimary}
					ctaSecondary={data.finalCta.ctaSecondary}
				/>
			)}
		</>
	)
}
