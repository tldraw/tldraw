import { ActionLink } from '@/components/ui/action-link'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { PageHeader } from '@/components/ui/page-header'
import type { PageRecord } from '@/types/content-types'
import { db } from '@/utils/ContentDatabase'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Features',
	description: 'Explore the features of the tldraw SDK.',
}

function getMeta(page: PageRecord) {
	return page.metadata ? JSON.parse(page.metadata) : {}
}

function getSlug(page: PageRecord) {
	// path is like /features/editor → slug is "editor"
	return page.path.replace('/features/', '')
}

export default async function FeaturesPage() {
	const allFeaturePages = await db.getPagesBySection('features')

	// Top-level feature pages (path has exactly one segment after /features/)
	const topLevel = allFeaturePages.filter((p) => {
		const slug = getSlug(p)
		return slug && !slug.includes('/')
	})

	const featured = topLevel.filter((p) => getMeta(p).category === 'featured')
	const groups = topLevel.filter((p) => getMeta(p).category === 'group')

	// For each group, find its children
	const groupsWithChildren = groups.map((group) => {
		const groupSlug = getSlug(group)
		const meta = getMeta(group)
		const children = allFeaturePages
			.filter((p) => {
				const slug = getSlug(p)
				return slug.startsWith(`${groupSlug}/`) && slug.split('/').length === 2
			})
			.map((child) => {
				const childMeta = getMeta(child)
				return {
					slug: getSlug(child).split('/')[1],
					title: child.title,
					description: child.description ?? '',
					eyebrow: childMeta.eyebrow,
				}
			})
		return { ...group, meta, slug: groupSlug, children }
	})

	return (
		<>
			<PageHeader title="Features" description="Everything you need to build with tldraw." />
			<div className="max-w-content mx-auto px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{/* Featured */}
				{featured.length > 0 && (
					<div className="mb-16">
						{featured.map((f) => {
							const meta = getMeta(f)
							const slug = getSlug(f)
							return (
								<Card key={f.id} as={Link} href={`/features/${slug}`} hover className="p-8">
									{meta.eyebrow && <Eyebrow>{meta.eyebrow}</Eyebrow>}
									<h2 className="mt-2 text-2xl font-semibold text-black dark:text-white">
										{f.title}
									</h2>
									<p className="text-body mt-2 dark:text-zinc-400">{f.description}</p>
								</Card>
							)
						})}
					</div>
				)}

				{/* Groups */}
				<div className="space-y-16">
					{groupsWithChildren.map((group) => (
						<div key={group.id}>
							<Link href={`/features/${group.slug}`} className="group">
								{group.meta.eyebrow && <Eyebrow>{group.meta.eyebrow}</Eyebrow>}
								<h2 className="group-hover:text-brand-blue mt-2 text-2xl font-semibold text-black dark:text-white">
									{group.title}
								</h2>
								<p className="text-body mt-2 max-w-2xl dark:text-zinc-400">
									{group.meta.heroSubtitle || group.description}
								</p>
							</Link>

							{group.children.length > 0 && (
								<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{group.children.map((child) => (
										<Card
											key={child.slug}
											as={Link}
											href={`/features/${group.slug}/${child.slug}`}
											hover
											className="p-5"
										>
											<h3 className="font-semibold text-black dark:text-white">{child.title}</h3>
											<p className="text-body mt-1 line-clamp-3 text-sm leading-relaxed dark:text-zinc-400">
												{child.description}
											</p>
											<ActionLink href={`/features/${group.slug}/${child.slug}`} className="mt-2">
												Learn more
											</ActionLink>
										</Card>
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
