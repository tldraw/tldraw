import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { CoverImage } from '@/components/sections/cover-image'
import { FeatureHero } from '@/components/sections/feature-hero'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { ActionLink } from '@/components/ui/action-link'
import { Card } from '@/components/ui/card'
import { Divider } from '@/components/ui/divider'
import { splitAtFirstH2, stripLeadingHero } from '@/lib/portable-text-utils'
import {
	getFeaturePage,
	getFeaturePages,
	getPullQuoteTestimonials,
	getSharedSections,
} from '@/sanity/queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface FeaturePageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
	const { slug } = await params
	const feature = await getFeaturePage(slug)
	if (!feature) return {}
	return {
		title: feature.seo?.metaTitle || feature.title,
		description: feature.seo?.metaDescription || feature.description,
	}
}

export async function generateStaticParams() {
	const features = await getFeaturePages()
	return (
		features
			?.filter((f) => f.category === 'group' || f.category === 'featured')
			.map((f) => ({ slug: f.slug.current })) || []
	)
}

export default async function FeatureDetailPage({ params }: FeaturePageProps) {
	const { slug } = await params
	const [feature, shared, pullQuoteTestimonials] = await Promise.all([
		getFeaturePage(slug),
		getSharedSections(),
		getPullQuoteTestimonials(),
	])

	if (!feature) notFound()

	const isGroup = feature.category === 'group'

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

			{/* Child capabilities list (for group pages) */}
			{isGroup && feature.children && feature.children.length > 0 && (
				<section className="pb-12 sm:pb-16">
					<div className="mx-auto max-w-content px-5 sm:px-8">
						<div className="grid gap-6 sm:grid-cols-2">
							{feature.children.map((child) => (
								<Card key={child.slug} hover className="group">
									<Link href={`/features/${slug}/${child.slug}`} className="block">
										<h3 className="text-lg font-semibold text-black dark:text-white">
											{child.title}
										</h3>
										<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
											{child.description}
										</p>
										<ActionLink href={`/features/${slug}/${child.slug}`} className="mt-3">
											Learn more
										</ActionLink>
									</Link>
								</Card>
							))}
						</div>
					</div>
				</section>
			)}

			{/* Cover image */}
			{feature.coverImage && <CoverImage image={feature.coverImage} alt={feature.title} />}

			{/* Body content — first section */}
			{bodyTop.length > 0 && (
				<section className="pb-12 sm:pb-16">
					<div className="mx-auto max-w-content px-5 sm:px-8">
						<RichText value={bodyTop} variant="feature" />
					</div>
				</section>
			)}

			{/* Body content — remaining sections */}
			{bodyBottom.length > 0 && (
				<section className="pb-16 sm:pb-24">
					<div className="mx-auto max-w-content px-5 sm:px-8">
						<RichText value={bodyBottom} variant="feature" />
					</div>
				</section>
			)}

			{/* Testimonial */}
			{shared?.testimonialSection && (
				<TestimonialFeature
					testimonials={
						pullQuoteTestimonials.length > 0
							? pullQuoteTestimonials
							: [shared.testimonialSection!.featured]
					}
					caseStudies={shared.testimonialSection.caseStudies}
				/>
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
