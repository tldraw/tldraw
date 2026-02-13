import { Markdown } from '@/components/markdown'
import { CommunitySection } from '@/components/sections/community-section'
import { CoverImage } from '@/components/sections/cover-image'
import { FeatureHero } from '@/components/sections/feature-hero'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { Divider } from '@/components/ui/divider'
import { db } from '@/utils/ContentDatabase'
import { getTestimonials } from '@/utils/collections'
import { getSharedSections } from '@/utils/shared-sections'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface ChildFeaturePageProps {
	params: Promise<{ slug: string; child: string }>
}

export async function generateMetadata({ params }: ChildFeaturePageProps): Promise<Metadata> {
	const { slug, child } = await params
	const page = await db.getPage(`/features/${slug}/${child}`)
	if (!page) return {}
	const meta = page.metadata ? JSON.parse(page.metadata) : {}
	return {
		title: meta.metaTitle || page.title,
		description: meta.metaDescription || page.description,
	}
}

export async function generateStaticParams() {
	const pages = await db.getPagesBySection('features')
	return pages
		.filter((p) => {
			const segments = p.path.replace('/features/', '').split('/')
			return segments.length === 2
		})
		.map((p) => {
			const segments = p.path.replace('/features/', '').split('/')
			return { slug: segments[0], child: segments[1] }
		})
}

/** Split markdown content at the first ## heading. */
function splitAtFirstH2(content: string): [string, string] {
	const idx = content.indexOf('\n## ')
	if (idx === -1) return [content, '']
	return [content.slice(0, idx), content.slice(idx)]
}

export default async function ChildFeaturePage({ params }: ChildFeaturePageProps) {
	const { slug, child } = await params
	const [page, shared, pullQuoteTestimonials] = await Promise.all([
		db.getPage(`/features/${slug}/${child}`),
		getSharedSections(),
		getTestimonials('pull-quote'),
	])

	if (!page) notFound()

	const meta = page.metadata ? JSON.parse(page.metadata) : {}
	const [bodyTop, bodyBottom] = page.content ? splitAtFirstH2(page.content) : ['', '']

	const testimonials = pullQuoteTestimonials.map((t) => ({
		quote: t.data.quote,
		author: t.data.author,
		role: t.data.role,
		company: t.data.company,
		avatar: t.data.avatar,
	}))

	return (
		<>
			<FeatureHero
				eyebrow={meta.eyebrow}
				title={page.title}
				subtitle={meta.heroSubtitle || page.description || ''}
				ctaPrimary={shared?.hero?.ctaPrimary}
				ctaSecondary={shared?.hero?.ctaSecondary}
			/>

			<Divider />

			{/* Body content — first section (before first h2 break) */}
			{bodyTop && (
				<section className="pb-12 sm:pb-16">
					<div className="max-w-content mx-auto px-5 sm:px-8">
						<Markdown content={bodyTop} />
					</div>
				</section>
			)}

			{/* Cover image */}
			{meta.coverImage && <CoverImage src={meta.coverImage} alt={page.title} />}

			{/* Body content — remaining sections (after first h2 break) */}
			{bodyBottom && (
				<section className="pb-16 sm:pb-24">
					<div className="max-w-content mx-auto px-5 sm:px-8">
						<Markdown content={bodyBottom} />
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
					testimonials={testimonials}
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
