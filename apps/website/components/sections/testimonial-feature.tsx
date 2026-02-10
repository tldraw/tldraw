import { ChevronRight } from '@/components/ui/chevron-icon'
import Link from 'next/link'
import type { PullQuoteTestimonial } from './pull-quote'
import { PullQuote } from './pull-quote'

interface CaseStudySummary {
	company: string
	description: string
	url: string
}

interface TestimonialFeatureProps {
	testimonials: PullQuoteTestimonial[]
	caseStudies: CaseStudySummary[]
}

export function TestimonialFeature({ testimonials, caseStudies }: TestimonialFeatureProps) {
	const [firstStudy, ...restStudies] = caseStudies

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl">
					<PullQuote testimonials={testimonials} />

					{/* First case study inline */}
					{firstStudy && (
						<div className="mt-8">
							<p className="text-sm leading-relaxed text-body dark:text-zinc-400">
								{firstStudy.description}
							</p>
							<Link
								href={firstStudy.url}
								className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-link hover:text-brand-link/90 dark:hover:text-brand-link/90"
							>
								Read the case study <ChevronRight />
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
									className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-link hover:text-brand-link/90 dark:hover:text-brand-link/90"
								>
									Read the case study <ChevronRight />
								</Link>
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	)
}
