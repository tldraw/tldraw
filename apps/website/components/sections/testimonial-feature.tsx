import Image from 'next/image'
import Link from 'next/link'

interface FeaturedTestimonial {
	quote: string
	author: string
	role: string
	company: string
	avatar?: string
}

interface CaseStudySummary {
	company: string
	description: string
	url: string
}

interface TestimonialFeatureProps {
	featured: FeaturedTestimonial
	caseStudies: CaseStudySummary[]
}

export function TestimonialFeature({ featured, caseStudies }: TestimonialFeatureProps) {
	const [firstStudy, ...restStudies] = caseStudies

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl">
					{/* Author info at top */}
					<div className="mb-8 flex items-center gap-3">
						{featured.avatar && (
							<Image
								src={featured.avatar}
								alt={featured.author}
								width={32}
								height={32}
								className="rounded-full"
							/>
						)}
						<p className="text-sm text-body dark:text-zinc-400">
							<span className="font-semibold text-black dark:text-white">{featured.author},</span>{' '}
							{featured.role} at{' '}
							<span className="font-semibold text-black dark:text-white">{featured.company}</span>
						</p>
					</div>

					{/* Quote */}
					<blockquote className="text-2xl font-semibold italic leading-[1.3] tracking-heading text-black dark:text-white sm:text-3xl">
						&ldquo;{featured.quote}&rdquo;
					</blockquote>

					{/* First case study inline */}
					{firstStudy && (
						<div className="mt-8">
							<p className="text-sm leading-relaxed text-body dark:text-zinc-400">
								{firstStudy.description}
							</p>
							<Link
								href={firstStudy.url}
								className="mt-2 inline-block text-sm font-medium text-brand-blue hover:text-blue-700 dark:text-brand-blue dark:hover:text-blue-400"
							>
								Read the case study &rarr;
							</Link>
						</div>
					)}
				</div>

				{/* Additional case studies */}
				{restStudies.length > 0 && (
					<div className="mx-auto mt-16 grid max-w-3xl gap-8 sm:grid-cols-2">
						{restStudies.map((study) => (
							<div key={study.company}>
								<p className="text-sm leading-relaxed text-body dark:text-zinc-400">
									{study.description}
								</p>
								<Link
									href={study.url}
									className="mt-2 inline-block text-sm font-medium text-brand-blue hover:text-blue-700 dark:text-brand-blue dark:hover:text-blue-400"
								>
									Read the case study &rarr;
								</Link>
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	)
}
