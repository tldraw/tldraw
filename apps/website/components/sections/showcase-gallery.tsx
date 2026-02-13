import { ActionLink } from '@/components/ui/action-link'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import Image from 'next/image'

interface ShowcaseGalleryEntry {
	_id?: string
	slug?: string
	name: string
	category: string
	description: string
	url: string
	caseStudyUrl?: string
	logo?: string
	coverImage?: string
}

interface ShowcaseGalleryProps {
	title?: string
	subtitle?: string
	items: ShowcaseGalleryEntry[]
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
						key={item._id ?? item.slug ?? item.name}
						className="flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white sm:flex-row dark:border-zinc-800 dark:bg-zinc-950"
					>
						{/* Image area */}
						{item.coverImage ? (
							<div className="aspect-4/3 shrink-0 overflow-hidden bg-zinc-100 sm:w-1/2 dark:bg-zinc-800">
								<Image
									src={item.coverImage}
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
									src={item.logo}
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
