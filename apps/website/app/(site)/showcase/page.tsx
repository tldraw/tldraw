import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { LogoBar } from '@/components/sections/logo-bar'
import { ProjectsGrid } from '@/components/sections/projects-grid'
import { ShowAndTellForm } from '@/components/sections/show-and-tell-form'
import { ShowcaseGallery } from '@/components/sections/showcase-gallery'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { PageHeader } from '@/components/ui/page-header'
import { getSharedSections, getShowcaseEntries, getShowcasePage } from '@/sanity/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Showcase',
	description: 'Discover how teams are building with the tldraw SDK.',
}

export default async function ShowcasePage() {
	const [sanityPage, sanityEntries, shared] = await Promise.all([
		getShowcasePage(),
		getShowcaseEntries(),
		getSharedSections(),
	])

	if (!sanityPage) return null

	return (
		<>
			<PageHeader title={sanityPage.heroTitle} description={sanityPage.heroSubtitle} />

			{sanityPage.logoBarEntries && sanityPage.logoBarEntries.length > 0 && (
				<LogoBar entries={sanityPage.logoBarEntries} />
			)}

			<ShowcaseGallery
				title={sanityPage.showcaseTitle}
				subtitle={sanityPage.showcaseSubtitle}
				items={sanityEntries}
			/>

			{sanityPage.showAndTellTitle && sanityPage.showAndTellDescription && (
				<ShowAndTellForm
					title={sanityPage.showAndTellTitle}
					description={sanityPage.showAndTellDescription}
				/>
			)}

			{sanityPage.projectsTitle && sanityPage.projectsSubtitle && sanityPage.projects && (
				<ProjectsGrid
					title={sanityPage.projectsTitle}
					subtitle={sanityPage.projectsSubtitle}
					projects={sanityPage.projects}
				/>
			)}

			{sanityPage.testimonial && sanityPage.caseStudySummaries && (
				<TestimonialFeature
					testimonials={[sanityPage.testimonial]}
					caseStudies={sanityPage.caseStudySummaries.map((s) => ({
						company: s.heading,
						description: s.description,
						url: s.url,
					}))}
				/>
			)}

			{shared?.finalCta && (
				<FinalCtaSection
					title={shared.finalCta.title}
					description={shared.finalCta.description}
					descriptionBold={shared.finalCta.descriptionBold}
					ctaPrimary={shared.finalCta.ctaPrimary}
					ctaSecondary={shared.finalCta.ctaSecondary}
				/>
			)}
		</>
	)
}
