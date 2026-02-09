import { urlFor } from '@/sanity/image'
import type { CaseStudy } from '@/sanity/types'
import Image from 'next/image'
import Link from 'next/link'

interface ShowcaseGalleryProps {
	items: CaseStudy[]
}

export function ShowcaseGallery({ items }: ShowcaseGalleryProps) {
	return (
		<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => (
				<Link
					key={item._id}
					href={`/showcase/${item.slug.current}`}
					className="group overflow-hidden rounded-xl border border-zinc-200 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
				>
					{item.coverImage && (
						<div className="aspect-video overflow-hidden">
							<Image
								src={urlFor(item.coverImage).width(640).height(360).url()}
								alt={item.title}
								width={640}
								height={360}
								className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
				</Link>
			))}
		</div>
	)
}
