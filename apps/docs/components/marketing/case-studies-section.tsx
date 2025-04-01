import { Section } from '@/components/marketing/section'
import { ReactNode } from 'react'
import { SectionSubtitle } from './section-description'
import { SectionTitle } from './section-title'

export function CaseStudiesSection() {
	return (
		<Section className="w-full max-w-6xl mx-auto">
			<SectionTitle>Made with tldraw</SectionTitle>
			<SectionSubtitle>Powering excellent products from world-class teams.</SectionSubtitle>
			<div>
				<CaseStudiesGridBig>
					<CaseStudyCard>
						<CaseStudyImage src="/images/case-studies/craft.jpg" />
						<CaseStudyDetails dir="col">
							<CaseStudyLogo src="/images/case-studies-logos/craft-logo.svg" />
							<CaseStudyDescription>
								Craft built a collaborative whiteboard feature for their app.
							</CaseStudyDescription>
						</CaseStudyDetails>
					</CaseStudyCard>
					<CaseStudyCard>
						<CaseStudyImage src="/images/case-studies/bbb.png" />
						<CaseStudyDetails dir="col">
							<CaseStudyLogo src="/images/case-studies-logos/bigbluebutton-logo.svg" />
							<CaseStudyDescription>
								BigBlueButton built their virtual classroom on tldraw&apos;s canvas.
							</CaseStudyDescription>
						</CaseStudyDetails>
					</CaseStudyCard>
				</CaseStudiesGridBig>
				<CaseStudiesGridSmall>
					<CaseStudyCard>
						<CaseStudyImage src="/images/case-studies/90.png" />
						<CaseStudyDetails dir="col">
							<CaseStudyLogo src="/images/case-studies-logos/jam-logo.svg" />
							<CaseStudyDescription>
								An incredible product from a superlative team.
							</CaseStudyDescription>
						</CaseStudyDetails>
					</CaseStudyCard>
					<CaseStudyCard>
						<CaseStudyImage src="/images/case-studies/legend-keeper.jpg" />
						<CaseStudyDetails dir="col">
							<CaseStudyLogo src="/images/case-studies-logos/jam-logo.svg" />
							<CaseStudyDescription>
								An incredible product from a superlative team.
							</CaseStudyDescription>
						</CaseStudyDetails>
					</CaseStudyCard>
					<CaseStudyCard>
						<CaseStudyImage src="/images/case-studies/jam.jpg" />
						<CaseStudyDetails dir="col">
							<CaseStudyLogo src="/images/case-studies-logos/jam-logo.svg" />
							<CaseStudyDescription>
								An incredible product from a superlative team.
							</CaseStudyDescription>
						</CaseStudyDetails>
					</CaseStudyCard>
				</CaseStudiesGridSmall>
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

function CaseStudyCard({ children }: { children: ReactNode }) {
	return (
		<div className="w-full border border-sm sm:rounded-lg overflow-hidden flex flex-col">
			{children}
		</div>
	)
}

function CaseStudyImage({ src }: { src: string }) {
	return <img className="w-full h-full object-cover" src={src} />
}

function CaseStudyDetails({ children, dir }: { children: ReactNode; dir?: 'row' | 'col' }) {
	return <div className={`p-4 border-t flex flex-${dir} gap-2`}>{children}</div>
}

function CaseStudyLogo({ src }: { src: string }) {
	return (
		<div className="flex-shrink-0">
			<img className="w-auto h-[48px]" src={src} />
		</div>
	)
}
function CaseStudyDescription({ children }: { children: ReactNode }) {
	return <div>{children}</div>
}

function CaseStudiesGridBig({ children }: { children: ReactNode }) {
	return (
		<div className={`pt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 md:gap-y-8 px-5`}>
			{children}
		</div>
	)
}

function CaseStudiesGridSmall({ children }: { children: ReactNode }) {
	return (
		<div
			className={`pt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 md:gap-y-8 px-5`}
		>
			{children}
		</div>
	)
}
