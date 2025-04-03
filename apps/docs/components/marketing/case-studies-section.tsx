import { Section } from '@/components/marketing/section'
import Link from 'next/link'
import { ReactNode } from 'react'
import { SectionSubtitle } from './section-description'
import { SectionTitle } from './section-title'

export function CaseStudiesSection() {
	return (
		<Section className="w-full max-w-[100%]">
			<div className="max-w-6xl mx-auto">
				<SectionTitle>Made with tldraw</SectionTitle>
				<SectionSubtitle>Powering excellent products from world-class teams.</SectionSubtitle>
				<div>
					<CaseStudiesGridBig>
						<CaseStudyJustLogoCard
							href="/blog/clickup-case-study"
							src="/images/case-studies/clickup-hero.png"
							logo="/images/case-studies/clickup-logo.svg"
						>
							<b>ClickUp</b> rebuilt their Whiteboard feature.{' '}
						</CaseStudyJustLogoCard>
						<CaseStudyJustLogoCard
							href="/blog/autodesk-case-study"
							src="/images/case-studies/autodesk-hero.png"
							logo="/images/case-studies/autodesk-logo.svg"
						>
							<b>Autodesk</b> built a board for Forma, the architectural design app.
						</CaseStudyJustLogoCard>
					</CaseStudiesGridBig>
					<CaseStudiesGridSmall>
						<CaseStudyJustLogoSmallCard
							href="/blog/jam-case-study"
							src="/images/case-studies/jam-hero.png"
							logo="/images/case-studies/jam-logo.svg"
						>
							<b>Jam</b> upgraded their screenshot annotation feature.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							href="/blog/craft-case-study"
							src="/images/case-studies/craft-hero.png"
							logo="/images/case-studies/craft-logo.svg"
						>
							<b>Craft</b> added a collaborative whiteboard to their productivity app.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							href="/blog/padlet-case-study"
							src="/images/case-studies/padlet-hero.png"
							logo="/images/case-studies/padlet-logo.svg"
						>
							<b>Padlet</b> built their Sandbox experience for teachers and students.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							href="/blog/roam-case-study"
							src="/images/case-studies/roam-hero.png"
							logo="/images/case-studies/roam-logo.svg"
						>
							<b>Ro.am</b> shipped a whiteboard for their virtual office.
						</CaseStudyJustLogoSmallCard>

						<CaseStudyJustLogoSmallCard
							href="/blog/mobbin-case-study"
							src="/images/case-studies/mobbin-hero.png"
							logo="/images/case-studies/mobbin-logo.svg"
						>
							<b>Mobbin</b> created internal tools for managing content and training models.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							href="/blog/legendkeeper-case-study"
							src="/images/case-studies/legendkeeper-hero.png"
							logo="/images/case-studies/legendkeeper-logo.svg"
						>
							<b>LegendKeeper</b> built a boards feature for their world-building wiki.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							href="/blog/bigbluebutton-case-study"
							src="/images/case-studies/bigbluebutton-hero.png"
							logo="/images/case-studies/bigbluebutton-logo.svg"
						>
							<b>BigBlueButton</b> rebuilt their virtual classroom on tldraw.
						</CaseStudyJustLogoSmallCard>
					</CaseStudiesGridSmall>
				</div>
			</div>
		</Section>
	)
}

// const caseStudies = [
// 	{ logo: CraftLogo, screenshot: Craft, name: 'Craft', url: 'https://www.craft.do/' },
// 	{
// 		logo: LegendKeeperLogo,
// 		screenshot: LegendKeeper,
// 		name: 'LegendKeeper',
// 		url: 'https://www.legendkeeper.com/',
// 	},
// 	{
// 		logo: PixelpaperLogo,
// 		screenshot: Pixelpaper,
// 		name: 'Pixelpaper',
// 		url: 'https://pixelpaper.io/',
// 	},
// 	{ logo: FormaLogo, screenshot: Forma, name: 'Autodesk Forma', url: 'https://tldraw.com/' },
// 	{ logo: JamLogo, screenshot: Jam, name: 'Jam', url: 'https://tldraw.com/' },
// ]

function CaseStudyJustLogoCard({
	children,
	src,
	href,
	logo,
}: {
	children: ReactNode
	src: string
	href: string
	logo: string
}) {
	return (
		<Link href={href}>
			<div className="bg-white relative dark:bg-black border border-border-zinc-200 hover:border-zinc-200 dark:border-black dark:hover:border-zinc-800 group transition-all delay-[.05s] relative w-full aspect-video overflow-hidden rounded-lg">
				<div
					className="absolute inset-0 z-[1] opacity-[0] group-hover:opacity-[1] bg-white dark:bg-black bg-cover transition-all delay-[.05s] bg-bottom"
					style={{ backgroundImage: `url(${src})` }}
				/>
				<div className="absolute inset-0 z-[2] flex items-center justify-center opacity-[1] group-hover:opacity-[0] transition-all delay-[.05s]">
					<CaseStudyLogoBig src={logo} />
				</div>
			</div>
			<p className="pt-5 px-0">{children}</p>
		</Link>
	)
}

function CaseStudyJustLogoSmallCard({
	children,
	src,
	href,
	logo,
}: {
	children: ReactNode
	src: string
	href: string
	logo: string
}) {
	return (
		<Link href={href}>
			<div className="bg-white relative dark:bg-black border border-border-zinc-200 hover:border-zinc-200 dark:border-black dark:hover:border-zinc-800 group transition-all delay-[.05s] relative overflow-hidden rounded-lg aspect-video w-full">
				<div
					className="absolute inset-0 z-[1] opacity-[0] group-hover:opacity-[1] bg-white dark:bg-black bg-cover transition-all delay-[.05s]"
					style={{ backgroundImage: `url(${src})` }}
				/>
				<div className="absolute inset-0 z-[2] flex items-center justify-center opacity-[1] group-hover:opacity-[0] transition-all delay-[.05s]">
					<CaseStudyLogoBig src={logo} />
				</div>
			</div>
			<p className="pt-5 px-0">{children}</p>
		</Link>
	)
}

function CaseStudyLogoBig({ src }: { src: string }) {
	return (
		<div className="flex-shrink-0">
			<img className="w-auto h-[96px]" src={src} />
		</div>
	)
}

function CaseStudiesGridBig({ children }: { children: ReactNode }) {
	return (
		<div className={`pt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 md:gap-y-8 px-5`}>
			{children}
		</div>
	)
}

function CaseStudiesGridSmall({ children }: { children: ReactNode }) {
	return (
		<div
			className={`pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 md:gap-y-8 px-5`}
		>
			{children}
		</div>
	)
}
