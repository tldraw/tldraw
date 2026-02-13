import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { LogoBar } from '@/components/sections/logo-bar'
import { ProjectsGrid } from '@/components/sections/projects-grid'
import { ShowAndTellForm } from '@/components/sections/show-and-tell-form'
import { ShowcaseGallery } from '@/components/sections/showcase-gallery'
import { TestimonialFeature } from '@/components/sections/testimonial-feature'
import { PageHeader } from '@/components/ui/page-header'
import { db } from '@/utils/ContentDatabase'
import { getLogoBarEntries, getShowcaseEntries } from '@/utils/collections'
import { getSharedSections } from '@/utils/shared-sections'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Showcase',
	description: 'Discover how teams are building with the tldraw SDK.',
}

export default async function ShowcasePage() {
	const [page, showcaseItems, logoBarItems, shared] = await Promise.all([
		db.getPage('/showcase'),
		getShowcaseEntries(),
		getLogoBarEntries(),
		getSharedSections(),
	])

	const meta = page?.metadata ? JSON.parse(page.metadata) : {}

	const entries = showcaseItems.map((e) => ({
		_id: e.id,
		name: e.data.name,
		category: e.data.category,
		description: e.data.description,
		url: e.data.url,
		caseStudyUrl: e.data.caseStudyUrl,
		logo: e.data.logo,
		coverImage: e.data.coverImage,
	}))

	const logoEntries = logoBarItems.map((e) => ({
		_key: e.id,
		name: e.data.name,
		logo: e.data.logo,
	}))

	return (
		<>
			<PageHeader
				title={meta.heroTitle ?? page?.title ?? 'Showcase'}
				description={meta.heroSubtitle}
			/>

			{logoEntries.length > 0 && <LogoBar entries={logoEntries} />}

			<ShowcaseGallery
				title={meta.showcaseTitle}
				subtitle={meta.showcaseSubtitle}
				items={entries}
			/>

			{meta.showAndTellTitle && meta.showAndTellDescription && (
				<ShowAndTellForm title={meta.showAndTellTitle} description={meta.showAndTellDescription} />
			)}

			{meta.projectsTitle && meta.projectsSubtitle && meta.projects && (
				<ProjectsGrid
					title={meta.projectsTitle}
					subtitle={meta.projectsSubtitle}
					projects={meta.projects}
				/>
			)}

			{meta.testimonial && meta.caseStudySummaries && (
				<TestimonialFeature
					testimonials={[meta.testimonial]}
					caseStudies={meta.caseStudySummaries.map(
						(s: { heading: string; description: string; url: string }) => ({
							company: s.heading,
							description: s.description,
							url: s.url,
						})
					)}
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
