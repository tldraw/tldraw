import { ActionLink } from '@/components/ui/action-link'
import { Section } from '@/components/ui/section'
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
		<Section>
			<div>
				<PullQuote testimonials={testimonials} />

				{/* First case study inline */}
				{firstStudy && (
					<div className="mt-8">
						<p className="text-sm leading-relaxed text-body dark:text-zinc-400">
							{firstStudy.description}
						</p>
						<ActionLink href={firstStudy.url} className="mt-2">
							Read the case study
						</ActionLink>
					</div>
				)}
			</div>

			{/* Additional case studies */}
			{restStudies.length > 0 && (
				<div className="mt-16 grid gap-8 sm:grid-cols-2">
					{restStudies.map((study) => (
						<div key={study.company}>
							<p className="text-sm leading-relaxed text-body dark:text-zinc-400">
								{study.description}
							</p>
							<ActionLink href={study.url} className="mt-2">
								Read the case study
							</ActionLink>
						</div>
					))}
				</div>
			)}
		</Section>
	)
}
