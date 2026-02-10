import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { urlFor } from '@/sanity/image'
import { getFeaturePageByParentAndSlug, getFeaturePages, getSharedSections } from '@/sanity/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
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
	const capabilities = features?.filter((f) => f.category === 'capability' && f.parentGroup) || []
	return capabilities.map((f) => ({
		slug: f.parentGroup!,
		child: f.slug.current,
	}))
}

export default async function ChildFeaturePage({ params }: ChildFeaturePageProps) {
	const { slug, child } = await params
	const [feature, shared] = await Promise.all([
		getFeaturePageByParentAndSlug(slug, child),
		getSharedSections(),
	])

	if (!feature) notFound()

	return (
		<>
			{/* Breadcrumb */}
			<div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
				<Link href={`/features/${slug}`} className="text-sm text-brand-blue hover:text-blue-700">
					&larr; Back to {slug.replace(/-/g, ' ')}
				</Link>
			</div>

			{/* Hero */}
			<section className="py-12 sm:py-20">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					{feature.eyebrow && (
						<p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">
							{feature.eyebrow}
						</p>
					)}
					<h1 className="mt-4 text-4xl font-semibold tracking-tight text-black dark:text-white sm:text-5xl">
						{feature.title}
					</h1>
					<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">
						{feature.heroSubtitle || feature.description}
					</p>
					{feature.coverImage && (
						<Image
							src={urlFor(feature.coverImage).width(1200).height(630).url()}
							alt={feature.title}
							width={1200}
							height={630}
							className="mt-8 rounded-lg"
							priority
						/>
					)}
				</div>
			</section>

			{/* Body content */}
			{feature.body && (
				<section className="pb-16 sm:pb-24">
					<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
						<RichText value={feature.body} />
					</div>
				</section>
			)}

			{/* Testimonial */}
			{shared?.testimonialSection && (
				<TestimonialFeature
					featured={shared.testimonialSection.featured}
					caseStudies={shared.testimonialSection.caseStudies}
				/>
			)}

			{/* Community */}
			{shared?.community && (
				<CommunitySection title={shared.community.title} stats={shared.community.stats} />
			)}
		</>
	)
}
