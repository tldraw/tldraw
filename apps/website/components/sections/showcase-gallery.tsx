import { urlFor } from '@/sanity/image'
import type { SanityImage } from '@/sanity/types'
import Image from 'next/image'
import Link from 'next/link'

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
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{(title || subtitle) && (
					<div className="mb-12">
						{title && (
							<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">
								{title}
							</h2>
						)}
						{subtitle && (
							<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">{subtitle}</p>
						)}
					</div>
				)}

				<div className="grid gap-6 sm:grid-cols-2">
					{items.map((item) => (
						<div
							key={getSlug(item.slug)}
							className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row"
						>
							{/* Image area */}
							{item.coverImage ? (
								<div className="aspect-[4/3] shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800 sm:w-1/2">
									<Image
										src={urlFor(item.coverImage).width(480).height(360).url()}
										alt={item.name}
										width={480}
										height={360}
										className="h-full w-full object-cover"
									/>
								</div>
							) : (
								<div className="hidden aspect-[4/3] shrink-0 bg-zinc-100 dark:bg-zinc-800 sm:block sm:w-1/2" />
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
								<span className="text-xs font-medium text-body dark:text-zinc-400">
									{item.category}
								</span>
								<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
									{item.description}
								</p>
								{item.caseStudyUrl && (
									<Link
										href={item.caseStudyUrl}
										className="mt-3 text-sm font-medium text-brand-blue hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
									>
										Read case study &rarr;
									</Link>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
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
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{(title || subtitle) && (
					<div className="mb-12">
						{title && (
							<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">
								{title}
							</h2>
						)}
						{subtitle && (
							<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">{subtitle}</p>
						)}
					</div>
				)}
				<div className="grid gap-6 sm:grid-cols-2">
					{items.map((item) => (
						<div
							key={item.slug}
							className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row"
						>
							{/* Image area */}
							{item.image ? (
								<div className="aspect-[4/3] shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800 sm:w-1/2">
									<Image
										src={item.image}
										alt={item.name}
										width={480}
										height={360}
										className="h-full w-full object-cover"
									/>
								</div>
							) : (
								<div className="hidden aspect-[4/3] shrink-0 bg-zinc-100 dark:bg-zinc-800 sm:block sm:w-1/2" />
							)}

							{/* Content */}
							<div className="flex flex-1 flex-col justify-center p-6">
								<h3 className="font-semibold text-black dark:text-white">{item.name}</h3>
								<span className="mt-1 text-xs font-medium text-body dark:text-zinc-400">
									{item.category}
								</span>
								<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
									{item.description}
								</p>
								<div className="mt-3 flex gap-4">
									{item.caseStudyUrl ? (
										<Link
											href={item.caseStudyUrl}
											className="text-sm font-medium text-brand-blue hover:text-blue-700"
										>
											Read case study &rarr;
										</Link>
									) : (
										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm font-medium text-brand-blue hover:text-blue-700"
										>
											Visit &rarr;
										</a>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
