import { RichText } from '@/components/portable-text'
import { urlFor } from '@/sanity/image'
import { getFeaturePage, getFeaturePages } from '@/sanity/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
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
	return features?.map((f) => ({ slug: f.slug.current })) || []
}

export default async function FeatureDetailPage({ params }: FeaturePageProps) {
	const { slug } = await params
	const feature = await getFeaturePage(slug)

	if (!feature) notFound()

	return (
		<article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
			<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
				{feature.title}
			</h1>
			<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{feature.description}</p>
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
			{feature.body && (
				<div className="mt-8">
					<RichText value={feature.body} />
				</div>
			)}
		</article>
	)
}
