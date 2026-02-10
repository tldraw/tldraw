import { PageHeader } from '@/components/ui/page-header'
import { getFeaturePagesByCategory } from '@/sanity/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Features',
	description: 'Explore the features of the tldraw SDK.',
}

export default async function FeaturesPage() {
	const features = await getFeaturePagesByCategory()

	const featured = features.filter((f) => f.category === 'featured')
	const groups = features.filter((f) => f.category === 'group')

	return (
		<>
			<PageHeader title="Features" description="Everything you need to build with tldraw." />
			<div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{/* Featured */}
				{featured.length > 0 && (
					<div className="mb-16">
						{featured.map((f) => (
							<Link
								key={f._id}
								href={`/features/${f.slug.current}`}
								className="block rounded-xl border border-zinc-200 p-8 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
							>
								{f.eyebrow && (
									<p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">
										{f.eyebrow}
									</p>
								)}
								<h2 className="mt-2 text-2xl font-semibold text-black dark:text-white">
									{f.title}
								</h2>
								<p className="mt-2 text-body dark:text-zinc-400">{f.description}</p>
							</Link>
						))}
					</div>
				)}

				{/* Groups */}
				<div className="space-y-16">
					{groups.map((group) => (
						<div key={group._id}>
							<Link href={`/features/${group.slug.current}`} className="group">
								{group.eyebrow && (
									<p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">
										{group.eyebrow}
									</p>
								)}
								<h2 className="mt-2 text-2xl font-semibold text-black group-hover:text-brand-blue dark:text-white">
									{group.title}
								</h2>
								<p className="mt-2 max-w-2xl text-body dark:text-zinc-400">
									{group.heroSubtitle || group.description}
								</p>
							</Link>

							{group.children && group.children.length > 0 && (
								<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{group.children.map((child) => (
										<Link
											key={child.slug}
											href={`/features/${group.slug.current}/${child.slug}`}
											className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
										>
											<h3 className="font-semibold text-black dark:text-white">{child.title}</h3>
											<p className="mt-1 text-sm leading-relaxed text-body dark:text-zinc-400 line-clamp-3">
												{child.description}
											</p>
											<span className="mt-2 inline-block text-sm font-medium text-brand-blue">
												Learn more &rarr;
											</span>
										</Link>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</>
	)
}
