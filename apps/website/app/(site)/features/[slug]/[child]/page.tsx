import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { CoverImage } from '@/components/sections/cover-image'
import { FeatureHero } from '@/components/sections/feature-hero'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { Divider } from '@/components/ui/divider'
import { splitAtFirstH2, stripLeadingHero } from '@/lib/portable-text-utils'
import {
	getFeaturePageByParentAndSlug,
	getFeaturePages,
	getPullQuoteTestimonials,
	getSharedSections,
} from '@/sanity/queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface ChildFeaturePageProps {
	params: Promise<{ slug: string; child: string }>
}

export async function generateMetadata({ params }: ChildFeaturePageProps): Promise<Metadata> {
	const { slug, child } = await params
	const feature = await getFeaturePageByParentAndSlug(slug, child)
	if (!feature) return {}
	return {
		title: feature.seo?.metaTitle || feature.title,
		description: feature.seo?.metaDescription || feature.description,
	}
}

export async function generateStaticParams() {
	const features = await getFeaturePages()
	if (!features) return []

	const capabilities = features.filter((f) => f.category === 'capability' && f.parentGroup)
	const standaloneParams = capabilities.map((f) => ({
		slug: f.parentGroup!,
		child: f.slug.current,
	}))

	const groups = features.filter((f) => f.category === 'group')
	const embeddedParams = groups.flatMap((g) =>
		(g.children ?? []).map((c) => ({
			slug: g.slug.current,
			child: c.slug,
		}))
	)

	const seen = new Set(standaloneParams.map((p) => `${p.slug}/${p.child}`))
	const uniqueEmbedded = embeddedParams.filter((p) => !seen.has(`${p.slug}/${p.child}`))

	return [...standaloneParams, ...uniqueEmbedded]
}

export default async function ChildFeaturePage({ params }: ChildFeaturePageProps) {
	const { slug, child } = await params
	const [feature, shared, pullQuoteTestimonials] = await Promise.all([
		getFeaturePageByParentAndSlug(slug, child),
		getSharedSections(),
		getPullQuoteTestimonials(),
	])

	if (!feature) notFound()

	const bodyBlocks =
		feature.body && feature.body.length > 0 ? stripLeadingHero(feature.body, feature.title) : []
	const [bodyTop, bodyBottom] = splitAtFirstH2(bodyBlocks)

	return (
		<>
			<FeatureHero
				eyebrow={feature.eyebrow}
				title={feature.title}
				subtitle={feature.heroSubtitle || feature.description}
				ctaPrimary={shared?.hero?.ctaPrimary}
				ctaSecondary={shared?.hero?.ctaSecondary}
			/>

			<Divider />

			{/* Body content — first section (before first h2 break) */}
			{bodyTop.length > 0 && (
				<section className="pb-12 sm:pb-16">
					<div className="max-w-content mx-auto px-5 sm:px-8">
						<RichText value={bodyTop} variant="feature" />
					</div>
				</section>
			)}

			{/* Cover image */}
			{feature.coverImage && <CoverImage image={feature.coverImage} alt={feature.title} />}

			{/* Body content — remaining sections (after first h2 break) */}
			{bodyBottom.length > 0 && (
				<section className="pb-16 sm:pb-24">
					<div className="max-w-content mx-auto px-5 sm:px-8">
						<RichText value={bodyBottom} variant="feature" />
					</div>
				</section>
			)}

			{/* Starter kits */}
			{shared?.starterKits && (
				<StarterKitsSection
					title={shared.starterKits.title}
					subtitle={shared.starterKits.subtitle}
					ctaLabel={shared.starterKits.ctaLabel}
					ctaUrl={shared.starterKits.ctaUrl}
					kits={shared.starterKits.kits}
				/>
			)}

			{/* Testimonial */}
			{shared?.testimonialSection && (
				<TestimonialFeature
					testimonials={pullQuoteTestimonials}
					caseStudies={shared.testimonialSection.caseStudies}
				/>
			)}

			{/* Final CTA */}
			{shared?.finalCta && (
				<FinalCtaSection
					title={shared.finalCta.title}
					description={shared.finalCta.description}
					descriptionBold={shared.finalCta.descriptionBold}
					ctaPrimary={shared.finalCta.ctaPrimary}
					ctaSecondary={shared.finalCta.ctaSecondary}
				/>
			)}

			{/* Community */}
			<CommunitySection />
		</>
	)
}
