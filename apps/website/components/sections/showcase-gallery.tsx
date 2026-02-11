import { ActionLink } from '@/components/ui/action-link'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { urlFor } from '@/sanity/image'
import type { SanityImage } from '@/sanity/types'
import Image from 'next/image'

// --- Sanity-backed gallery (with images) ---

interface ShowcaseGalleryEntry {
	_id?: string
	slug: string | { current: string }
	name: string
	category: string
	description: string
	url: string
	caseStudyUrl?: string
	logo?: SanityImage
	coverImage?: SanityImage
}

interface ShowcaseGalleryProps {
	title?: string
	subtitle?: string
	items: ShowcaseGalleryEntry[]
}

function getSlug(slug: string | { current: string }): string {
	return typeof slug === 'string' ? slug : slug.current
}

/**
 * Showcase gallery matching the Framer layout:
 * - 2-column grid
 * - Each card has a cover image (left) and content (right) side by side
 * - Falls back to text-only card when no coverImage is present
 */
export function ShowcaseGallery({ title, subtitle, items }: ShowcaseGalleryProps) {
	return (
		<Section>
			{(title || subtitle) && (
				<div className="mb-12">
					<SectionHeading title={title ?? ''} description={subtitle} />
				</div>
			)}

			<div className="grid gap-6 sm:grid-cols-2">
				{items.map((item) => (
					<div
						key={getSlug(item.slug)}
						className="flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white sm:flex-row dark:border-zinc-800 dark:bg-zinc-950"
					>
						{/* Image area */}
						{item.coverImage ? (
							<div className="aspect-4/3 shrink-0 overflow-hidden bg-zinc-100 sm:w-1/2 dark:bg-zinc-800">
								<Image
									src={urlFor(item.coverImage).width(480).height(360).url()}
									alt={item.name}
									width={480}
									height={360}
									className="h-full w-full object-cover"
								/>
							</div>
						) : (
							<div className="hidden aspect-4/3 shrink-0 bg-zinc-100 sm:block sm:w-1/2 dark:bg-zinc-800" />
						)}

						{/* Content area */}
						<div className="flex flex-1 flex-col justify-center p-6">
							{item.logo && (
								<Image
									src={urlFor(item.logo).height(24).url()}
									alt={item.name}
									width={80}
									height={24}
									className="mb-2 h-5 w-auto"
								/>
							)}
							<span className="text-body text-xs font-medium dark:text-zinc-400">
								{item.category}
							</span>
							<p className="text-body mt-2 text-sm leading-relaxed dark:text-zinc-400">
								{item.description}
							</p>
							{item.caseStudyUrl && (
								<ActionLink href={item.caseStudyUrl} className="mt-3">
									Read case study
								</ActionLink>
							)}
						</div>
					</div>
				))}
			</div>
		</Section>
	)
}

// --- Simple gallery (fallback with local images, no Sanity) ---

interface SimpleShowcaseEntry {
	slug: string
	name: string
	category: string
	description: string
	url: string
	caseStudyUrl?: string
	image?: string
}

interface ShowcaseGallerySimpleProps {
	title?: string
	subtitle?: string
	items: SimpleShowcaseEntry[]
}

/** Gallery for simple showcase entries with optional local images */
export function ShowcaseGallerySimple({ title, subtitle, items }: ShowcaseGallerySimpleProps) {
	return (
		<Section>
			{(title || subtitle) && (
				<div className="mb-12">
					<SectionHeading title={title ?? ''} description={subtitle} />
				</div>
			)}
			<div className="grid gap-6 sm:grid-cols-2">
				{items.map((item) => (
					<div
						key={item.slug}
						className="flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white sm:flex-row dark:border-zinc-800 dark:bg-zinc-950"
					>
						{/* Image area */}
						{item.image ? (
							<div className="aspect-4/3 shrink-0 overflow-hidden bg-zinc-100 sm:w-1/2 dark:bg-zinc-800">
								<Image
									src={item.image}
									alt={item.name}
									width={480}
									height={360}
									className="h-full w-full object-cover"
								/>
							</div>
						) : (
							<div className="hidden aspect-4/3 shrink-0 bg-zinc-100 sm:block sm:w-1/2 dark:bg-zinc-800" />
						)}

						{/* Content */}
						<div className="flex flex-1 flex-col justify-center p-6">
							<h3 className="font-semibold text-black dark:text-white">{item.name}</h3>
							<span className="text-body mt-1 text-xs font-medium dark:text-zinc-400">
								{item.category}
							</span>
							<p className="text-body mt-2 text-sm leading-relaxed dark:text-zinc-400">
								{item.description}
							</p>
							<div className="mt-3 flex gap-4">
								{item.caseStudyUrl ? (
									<ActionLink href={item.caseStudyUrl}>Read case study</ActionLink>
								) : (
									<ActionLink href={item.url} external>
										Visit
									</ActionLink>
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</Section>
	)
}
