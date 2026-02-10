import { urlFor } from '@/sanity/image'
import type { SanityImage } from '@/sanity/types'
import Image from 'next/image'

interface Project {
	name: string
	description: string
	url: string
	linkLabel?: string
	/** Sanity image (from CMS) */
	coverImage?: SanityImage
	/** Local image path in /public (fallback) */
	image?: string
}

interface ProjectsGridProps {
	title: string
	subtitle: string
	projects: Project[]
}

export function ProjectsGrid({ title, subtitle, projects }: ProjectsGridProps) {
	return (
		<section className="bg-zinc-50 py-16 dark:bg-zinc-900 sm:py-24">
			<div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
				<div>
					<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">{title}</h2>
					<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">{subtitle}</p>
				</div>

				<div className="mt-12 grid gap-8 sm:grid-cols-2">
					{projects.map((project) => {
						const imgSrc = project.coverImage
							? urlFor(project.coverImage).width(640).height(360).url()
							: project.image

						return (
							<div
								key={project.name}
								className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
							>
								{imgSrc ? (
									<div className="aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800">
										<Image
											src={imgSrc}
											alt={project.name}
											width={640}
											height={360}
											className="h-full w-full object-cover"
										/>
									</div>
								) : (
									<div className="aspect-video bg-zinc-100 dark:bg-zinc-800" />
								)}
								<div className="p-6">
									<h3 className="text-lg font-semibold text-black dark:text-white">
										{project.name}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
										{project.description}
									</p>
									<a
										href={project.url}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-4 inline-block text-sm font-medium text-brand-blue hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
									>
										{project.linkLabel || `Visit ${project.name}`} &rarr;
									</a>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</section>
	)
}
