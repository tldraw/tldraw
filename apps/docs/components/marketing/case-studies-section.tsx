import { Section } from '@/components/marketing/section'
import { cn } from '@/utils/cn'
import Link from 'next/link'
import { ReactNode } from 'react'
import { MaskedLogo } from './masked-logo'
import { SectionSubtitle } from './section-description'
import { SectionTitle } from './section-title'

export function CaseStudiesSection() {
	return (
		<Section className="w-full max-w-[100%]" id="case-studies">
			<div className="max-w-6xl mx-auto">
				<SectionTitle>Made with tldraw</SectionTitle>
				<SectionSubtitle>Powering excellent products from world-class teams.</SectionSubtitle>
				<div>
					<CaseStudiesGridBig>
						<CaseStudyJustLogoCard
							id="clickup"
							href="/blog/case-studies/clickup"
							src="/images/case-studies/clickup-hero.png"
							logo="/images/case-studies/clickup-logo.svg"
						>
							<b>ClickUp</b> rebuilt their Whiteboard feature.{' '}
						</CaseStudyJustLogoCard>
						<CaseStudyJustLogoCard
							id="autodesk"
							href="/blog/case-studies/autodesk"
							src="/images/case-studies/autodesk-hero.png"
							logo="/images/case-studies/autodesk-logo.svg"
						>
							<b>Autodesk</b> built a board for Forma, the architectural design app.
						</CaseStudyJustLogoCard>
					</CaseStudiesGridBig>
					<CaseStudiesGridSmall>
						<CaseStudyJustLogoSmallCard
							id="jam"
							href="/blog/case-studies/jam"
							src="/images/case-studies/jam-hero.png"
							logo="/images/case-studies/jam-logo.svg"
						>
							<b>Jam</b> upgraded their screenshot annotation feature.
						</CaseStudyJustLogoSmallCard>
						{/* <CaseStudyJustLogoSmallCard
							href="/blog/case-studies/craft"
							src="/images/case-studies/craft-hero.png"
							logo="/images/case-studies/craft-logo.svg"
						>
							<b>Craft</b> added a collaborative whiteboard to their productivity app.
						</CaseStudyJustLogoSmallCard> */}
						<CaseStudyJustLogoSmallCard
							id="padlet"
							href="/blog/case-studies/padlet"
							src="/images/case-studies/padlet-hero.png"
							logo="/images/case-studies/padlet-logo.svg"
						>
							<b>Padlet</b> built their Sandbox experience for teachers and students.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							id="roam"
							href="/blog/case-studies/roam"
							src="/images/case-studies/roam-hero.png"
							logo="/images/case-studies/roam-logo.svg"
						>
							<b>Ro.am</b> shipped a whiteboard for their virtual office.
						</CaseStudyJustLogoSmallCard>

						<CaseStudyJustLogoSmallCard
							id="mobbin"
							href="/blog/case-studies/mobbin"
							src="/images/case-studies/mobbin-hero.png"
							logo="/images/case-studies/mobbin-logo.svg"
						>
							<b>Mobbin</b> created internal tools for managing content and training models.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							id="legendkeeper"
							href="/blog/case-studies/legendkeeper"
							src="/images/case-studies/legendkeeper-hero.png"
							logo="/images/case-studies/legendkeeper-logo.svg"
						>
							<b>LegendKeeper</b> built a boards feature for their world-building wiki.
						</CaseStudyJustLogoSmallCard>
						<CaseStudyJustLogoSmallCard
							id="bigbluebutton"
							href="/blog/case-studies/bigbluebutton"
							src="/images/case-studies/bigbluebutton-hero.png"
							logo="/images/case-studies/bigbluebutton-logo.svg"
						>
							<b>BigBlueButton</b> rebuilt their virtual classroom on tldraw.
						</CaseStudyJustLogoSmallCard>
						{/* <CaseStudyJustLogoSmallCard
							id="opennote"
							href="/blog/case-studies/opennote"
							src="/images/case-studies/opennote-hero.png"
							logo="/images/case-studies/opennote-logo.svg"
						>
							<b>Opennote</b> added a whiteboard to their AI chat.
						</CaseStudyJustLogoSmallCard> */}
						<CaseStudyJustLogoSmallCard
							id="matilda"
							href="/blog/case-studies/matilda"
							src="/images/case-studies/matilda-hero.png"
							logo="/images/case-studies/matilda-logo.svg"
						>
							<b>Matilda</b> unified their app experience with tldraw.
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
	id,
	src,
	href,
	logo,
}: {
	children: ReactNode
	id: string
	src: string
	href: string
	logo: string
}) {
	return (
		<div className="group/link" id={id}>
			<CaseStudyCard>
				<CaseStudyImage src={src} />
				<Link href={href}>
					<div className="absolute inset-0 z-[2] flex items-center justify-center opacity-[1] group-hover:opacity-[0] transition-all delay-[.05s]">
						<CaseStudyLogoBig src={logo} />
					</div>
				</Link>
			</CaseStudyCard>
			<CaseStudyCopy href={href}>{children}</CaseStudyCopy>
		</div>
	)
}

function CaseStudyJustLogoSmallCard({
	children,
	id,
	src,
	href,
	logo,
}: {
	children: ReactNode
	id: string
	src: string
	href: string
	logo: string
}) {
	return (
		<div className="group" id={id}>
			<CaseStudyCard>
				<CaseStudyImage src={src} />
				<Link href={href}>
					<div className="absolute inset-0 z-[2] flex items-center justify-center opacity-[1] group-hover:opacity-[0] transition-all delay-[.05s]">
						<CaseStudyLogoBig src={logo} />
					</div>
				</Link>
			</CaseStudyCard>
			<CaseStudyCopy href={href}>{children}</CaseStudyCopy>
		</div>
	)
}

function CaseStudyCard({ children }: { children: ReactNode }) {
	return (
		<div
			className={cn(
				'bg-white relative dark:bg-black group transition-all delay-[.05s] relative overflow-hidden rounded-lg h-[160px] sm:h-auto sm:aspect-video w-full',
				'border border-border-zinc-200 hover:border-transparent dark:border-zinc-800 dark:hover:border-transparent'
			)}
		>
			{children}
		</div>
	)
}

function CaseStudyImage({ src }: { src: string }) {
	return (
		<div
			className="absolute inset-0 z-[1] opacity-[0] group-hover:opacity-[1] bg-white dark:bg-black bg-cover transition-all delay-[.05s]"
			style={{ backgroundImage: `url(${src})` }}
		/>
	)
}

function CaseStudyCopy({ children, href }: { children: ReactNode; href: string }) {
	return (
		<p className="pt-5 px-0">
			{children} Read the{' '}
			<Link href={href} className="group-hover:text-blue-600 dark:group-hover:text-blue-400">
				case study
			</Link>
			.
		</p>
	)
}

function CaseStudyLogoBig({ src }: { src: string }) {
	return (
		<div className="flex-shrink-0">
			<MaskedLogo src={src} />
			{/* <img className="w-auto h-[96px]" src={src} /> */}
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
