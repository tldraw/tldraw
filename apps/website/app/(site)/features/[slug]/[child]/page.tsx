import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { FeatureHeroCta } from '@/components/sections/feature-hero-cta'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { Eyebrow } from '@/components/ui/eyebrow'
import { splitAtFirstH2, stripLeadingHero } from '@/lib/portable-text-utils'
import { urlFor } from '@/sanity/image'
import {
	getFeaturePageByParentAndSlug,
	getFeaturePages,
	getPullQuoteTestimonials,
	getSharedSections,
} from '@/sanity/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
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
			{/* Hero */}
			<section className="pt-20 sm:pt-32">
				<div className="mx-auto max-w-content px-5 sm:px-8">
					{feature.eyebrow && <Eyebrow>{feature.eyebrow}</Eyebrow>}
					<h1 className="mt-4 text-4xl font-semibold tracking-heading text-black dark:text-white sm:text-5xl lg:text-6xl">
						{feature.title}
					</h1>
					<p className="mt-6 max-w-2xl text-lg leading-8 text-body dark:text-zinc-400">
						{feature.heroSubtitle || feature.description}
					</p>
					{shared?.hero?.ctaPrimary && (
						<FeatureHeroCta
							ctaPrimary={shared.hero.ctaPrimary}
							ctaSecondary={shared.hero.ctaSecondary}
						/>
					)}
				</div>
			</section>

			{/* Divider */}
			<div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
				<hr className="border-zinc-200 dark:border-zinc-800" />
			</div>

			{/* Body content — first section (before first h2 break) */}
			{bodyTop.length > 0 && (
				<section className="pb-12 sm:pb-16">
					<div className="mx-auto max-w-content px-5 sm:px-8">
						<RichText value={bodyTop} variant="feature" />
					</div>
				</section>
			)}

			{/* Cover image (between body sections, matching production layout) */}
			{feature.coverImage && (
				<section className="pb-12 sm:pb-16">
					<div className="mx-auto max-w-content px-5 sm:px-8">
						<Image
							src={urlFor(feature.coverImage).width(1200).height(630).url()}
							alt={feature.title}
							width={1200}
							height={630}
							className="rounded-lg"
							priority
						/>
					</div>
				</section>
			)}

			{/* Body content — remaining sections (after first h2 break) */}
			{bodyBottom.length > 0 && (
				<section className="pb-16 sm:pb-24">
					<div className="mx-auto max-w-content px-5 sm:px-8">
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
					testimonials={
						pullQuoteTestimonials.length > 0
							? pullQuoteTestimonials
							: [shared.testimonialSection.featured]
					}
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
