import { ActionLink } from '@/components/ui/action-link'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import Image from 'next/image'

interface Project {
	name: string
	description: string
	url: string
	linkLabel?: string
	coverImage?: string
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
		<Section bg="muted">
			<SectionHeading title={title} description={subtitle} />

			<div className="mt-12 grid gap-8 sm:grid-cols-2">
				{projects.map((project) => {
					const imgSrc = project.coverImage ?? project.image

					return (
						<div
							key={project.name}
							className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
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
								<h3 className="text-lg font-semibold text-black dark:text-white">{project.name}</h3>
								<p className="text-body mt-2 text-sm leading-relaxed dark:text-zinc-400">
									{project.description}
								</p>
								<ActionLink href={project.url} external className="mt-4">
									{project.linkLabel || `Visit ${project.name}`}
								</ActionLink>
							</div>
						</div>
					)
				})}
			</div>
		</Section>
	)
}
