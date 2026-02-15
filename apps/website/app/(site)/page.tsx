import { CommunitySection } from '@/components/sections/community-section'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { HeroDemoClient } from '@/components/sections/hero-demo-client'
import { HeroSection } from '@/components/sections/hero-section'
import { LogoBar } from '@/components/sections/logo-bar'
import { ShowcaseSection } from '@/components/sections/showcase-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { WhatsInsideGrid } from '@/components/sections/whats-inside-grid'
import { WhiteboardKitSection } from '@/components/sections/whiteboard-kit-section'
import { WhyTldrawGrid } from '@/components/sections/why-tldraw-grid'
import { heroDemoCodeSnippet } from '@/lib/hero-demo-code'
import { db } from '@/utils/ContentDatabase'
import { getLogoBarEntries, getTestimonials } from '@/utils/collections'
import { codeToHtml } from 'shiki'

function addKeys<T>(items: T[]): (T & { _key: string })[] {
	return items.map((item, i) => ({ ...item, _key: `item-${i}` }))
}

export default async function HomePage() {
	const [page, pullQuoteTestimonials, logoBarItems] = await Promise.all([
		db.getPage('/'),
		getTestimonials('pull-quote'),
		getLogoBarEntries(),
	])

	const meta = page?.metadata ? JSON.parse(page.metadata) : {}

	const data = {
		hero: meta.hero,
		whyTldraw: meta.whyTldraw
			? { ...meta.whyTldraw, items: addKeys(meta.whyTldraw.items) }
			: undefined,
		showcaseSection: meta.showcaseSection,
		whatsInside: meta.whatsInside
			? { ...meta.whatsInside, items: addKeys(meta.whatsInside.items) }
			: undefined,
		whiteboardKit: meta.whiteboardKit
			? { ...meta.whiteboardKit, features: addKeys(meta.whiteboardKit.features) }
			: undefined,
		starterKits: meta.starterKits
			? { ...meta.starterKits, kits: addKeys(meta.starterKits.kits) }
			: undefined,
		testimonialSection: meta.testimonialSection,
		finalCta: meta.finalCta,
	}

	const testimonials = pullQuoteTestimonials.map((t) => ({
		quote: t.data.quote,
		author: t.data.author,
		role: t.data.role,
		company: t.data.company,
		avatar: t.data.avatar,
	}))

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
					<LogoBar
						entries={logoBarItems.map((e) => ({
							_key: e.id,
							name: e.data.name,
							logo: e.data.logo,
						}))}
					/>
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
			<CommunitySection />
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
					testimonials={testimonials.length > 0 ? testimonials : []}
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
