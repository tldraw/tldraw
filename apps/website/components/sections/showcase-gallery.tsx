import { urlFor } from '@/sanity/image'
import type { CaseStudy } from '@/sanity/types'
import Image from 'next/image'

interface ShowcaseGalleryProps {
	items: CaseStudy[]
}

export function ShowcaseGallery({ items }: ShowcaseGalleryProps) {
	return (
		<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => (
				<div
					key={item._id}
					className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
				>
					{item.coverImage && (
						<div className="aspect-video overflow-hidden">
							<Image
								src={urlFor(item.coverImage).width(640).height(360).url()}
								alt={item.title}
								width={640}
								height={360}
								className="h-full w-full object-cover"
							/>
						</div>
					)}
					<div className="p-6">
						{item.logo && (
							<Image
								src={urlFor(item.logo).height(24).url()}
								alt={item.company}
								width={80}
								height={24}
								className="mb-3 h-6 w-auto"
							/>
						)}
						<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
						<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.company}</p>
						<p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
							{item.excerpt}
						</p>
					</div>
				</div>
			))}
		</div>
	)
}
