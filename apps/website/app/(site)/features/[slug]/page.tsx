import { Markdown } from '@/components/markdown'
import { CommunitySection } from '@/components/sections/community-section'
import { CoverImage } from '@/components/sections/cover-image'
import { FeatureHero } from '@/components/sections/feature-hero'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { StarterKitsSection } from '@/components/sections/starter-kits-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { ActionLink } from '@/components/ui/action-link'
import { Card } from '@/components/ui/card'
import { Divider } from '@/components/ui/divider'
import { db } from '@/utils/ContentDatabase'
import { getTestimonials } from '@/utils/collections'
import { getSharedSections } from '@/utils/shared-sections'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface FeaturePageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
	const { slug } = await params
	const page = await db.getPage(`/features/${slug}`)
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
			const slug = p.path.replace('/features/', '')
			return slug && !slug.includes('/')
		})
		.map((p) => ({ slug: p.path.replace('/features/', '') }))
}

/** Split markdown content at the first ## heading. */
function splitAtFirstH2(content: string): [string, string] {
	const idx = content.indexOf('\n## ')
	if (idx === -1) return [content, '']
	return [content.slice(0, idx), content.slice(idx)]
}

export default async function FeatureDetailPage({ params }: FeaturePageProps) {
	const { slug } = await params
	const [page, shared, pullQuoteTestimonials] = await Promise.all([
		db.getPage(`/features/${slug}`),
		getSharedSections(),
		getTestimonials('pull-quote'),
	])

	if (!page) notFound()

	const meta = page.metadata ? JSON.parse(page.metadata) : {}
	const isGroup = meta.category === 'group'

	// Find child pages for group pages
	const childPages = isGroup
		? (await db.getPagesByPathPrefix(`/features/${slug}/`)).map((child) => {
				const childMeta = child.metadata ? JSON.parse(child.metadata) : {}
				return {
					slug: child.path.split('/').pop()!,
					title: child.title,
					description: child.description ?? '',
					eyebrow: childMeta.eyebrow,
				}
			})
		: []

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

			{/* Child capabilities list (for group pages) */}
			{isGroup && childPages.length > 0 && (
				<section className="pb-12 sm:pb-16">
					<div className="max-w-content mx-auto px-5 sm:px-8">
						<div className="grid gap-6 sm:grid-cols-2">
							{childPages.map((child) => (
								<Card key={child.slug} hover className="group">
									<Link href={`/features/${slug}/${child.slug}`} className="block">
										<h3 className="text-lg font-semibold text-black dark:text-white">
											{child.title}
										</h3>
										<p className="text-body mt-2 text-sm leading-relaxed dark:text-zinc-400">
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
			{meta.coverImage && <CoverImage src={meta.coverImage} alt={page.title} />}

			{/* Body content — first section */}
			{bodyTop && (
				<section className="pb-12 sm:pb-16">
					<div className="max-w-content mx-auto px-5 sm:px-8">
						<Markdown content={bodyTop} />
					</div>
				</section>
			)}

			{/* Body content — remaining sections */}
			{bodyBottom && (
				<section className="pb-16 sm:pb-24">
					<div className="max-w-content mx-auto px-5 sm:px-8">
						<Markdown content={bodyBottom} />
					</div>
				</section>
			)}

			{/* Testimonial */}
			{shared?.testimonialSection && (
				<TestimonialFeature
					testimonials={testimonials}
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
