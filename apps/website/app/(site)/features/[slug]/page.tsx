import { RichText } from '@/components/portable-text'
import { CommunitySection } from '@/components/sections/community-section'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { urlFor } from '@/sanity/image'
import { getFeaturePage, getFeaturePages, getSharedSections } from '@/sanity/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
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
	const [feature, shared] = await Promise.all([getFeaturePage(slug), getSharedSections()])

	if (!feature) notFound()

	const isGroup = feature.category === 'group'

	return (
		<>
			{/* Hero */}
			<section className="py-16 sm:py-24">
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

			{/* Child capabilities list (for group pages) */}
			{isGroup && feature.children && feature.children.length > 0 && (
				<section className="py-16 sm:py-24">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="space-y-8">
							{feature.children.map((child) => (
								<div
									key={child.slug}
									className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
								>
									<h3 className="text-lg font-semibold text-black dark:text-white">
										{child.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
										{child.description}
									</p>
									<Link
										href={`/features/${slug}/${child.slug}`}
										className="mt-3 inline-block text-sm font-medium text-brand-blue hover:text-blue-700"
									>
										Learn more &rarr;
									</Link>
								</div>
							))}
						</div>
					</div>
				</section>
			)}

			{/* Body content (portable text) */}
			{feature.body && (
				<section className="py-16 sm:py-24">
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
