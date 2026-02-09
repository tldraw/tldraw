import { PageHeader } from '@/components/ui/page-header'
import { urlFor } from '@/sanity/image'
import { getFeaturePages } from '@/sanity/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Features',
	description: 'Explore the features of the tldraw SDK.',
}

export default async function FeaturesPage() {
	const features = await getFeaturePages()

	return (
		<>
			<PageHeader title="Features" description="Everything you need to build with tldraw." />
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{features?.length > 0 ? (
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<Link
								key={feature._id}
								href={`/features/${feature.slug.current}`}
								className="group rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
							>
								{feature.coverImage && (
									<Image
										src={urlFor(feature.coverImage).width(400).height(225).url()}
										alt={feature.title}
										width={400}
										height={225}
										className="mb-4 rounded-lg"
									/>
								)}
								{feature.icon && <div className="mb-3 text-2xl">{feature.icon}</div>}
								<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
									{feature.title}
								</h3>
								<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
									{feature.description}
								</p>
							</Link>
						))}
					</div>
				) : (
					<p className="text-center text-zinc-500 dark:text-zinc-400">Feature pages coming soon.</p>
				)}
			</div>
		</>
	)
}
