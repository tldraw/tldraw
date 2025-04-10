import { Section } from '@/components/marketing/section'
import { cn } from '@/utils/cn'
import Link from 'next/link'
import { ReactNode } from 'react'
import { MaskedLogo } from './masked-logo'
import { SectionSubtitle } from './section-description'
import { SectionTitle } from './section-title'

interface CaseStudyInfo {
	id: string
	href: string
	src: string
	logo: string
	content: ReactNode
	caseStudy: boolean
}

const caseStudiesBig: CaseStudyInfo[] = [
	{
		id: 'clickup',
		href: '/blog/case-studies/clickup',
		src: '/images/case-studies/clickup-hero.png',
		logo: '/images/case-studies/clickup-logo.svg',
		content: (
			<>
				<b>ClickUp</b> rebuilt their Whiteboard feature.
			</>
		),
		caseStudy: true,
	},
	{
		id: 'autodesk',
		href: '/blog/case-studies/autodesk',
		src: '/images/case-studies/autodesk-hero.png',
		logo: '/images/case-studies/autodesk-logo.svg',
		content: (
			<>
				<b>Autodesk</b> built a board for Forma, the architectural design app.
			</>
		),
		caseStudy: false,
	},
]

const caseStudiesSmall: CaseStudyInfo[] = [
	{
		id: 'padlet',
		href: '/blog/case-studies/padlet',
		src: '/images/case-studies/padlet-hero.png',
		logo: '/images/case-studies/padlet-logo.svg',
		content: (
			<>
				<b>Padlet</b> built their Sandbox experience for teachers and students.
			</>
		),
		caseStudy: true,
	},
	{
		id: 'jam',
		href: '/blog/case-studies/jam',
		src: '/images/case-studies/jam-hero.png',
		logo: '/images/case-studies/jam-logo.svg',
		content: (
			<>
				<b>Jam</b> upgraded their screenshot annotation feature.
			</>
		),
		caseStudy: true,
	},
	{
		id: 'mobbin',
		href: '/blog/case-studies/mobbin',
		src: '/images/case-studies/mobbin-hero.png',
		logo: '/images/case-studies/mobbin-logo.svg',
		content: (
			<>
				<b>Mobbin</b> created internal tools for managing content and training models.
			</>
		),
		caseStudy: true,
	},
	{
		id: 'roam',
		href: '/blog/case-studies/roam',
		src: '/images/case-studies/roam-hero.png',
		logo: '/images/case-studies/roam-logo.svg',
		content: (
			<>
				<b>Ro.am</b> shipped a whiteboard for their virtual office.
			</>
		),
		caseStudy: false,
	},
	{
		id: 'legendkeeper',
		href: '/blog/case-studies/legendkeeper',
		src: '/images/case-studies/legendkeeper-hero.png',
		logo: '/images/case-studies/legendkeeper-logo.svg',
		content: (
			<>
				<b>LegendKeeper</b> built a boards feature for their world-building wiki.
			</>
		),
		caseStudy: false,
	},
	{
		id: 'bigbluebutton',
		href: '/blog/case-studies/bigbluebutton',
		src: '/images/case-studies/bigbluebutton-hero.png',
		logo: '/images/case-studies/bigbluebutton-logo.svg',
		content: (
			<>
				<b>BigBlueButton</b> rebuilt their virtual classroom on tldraw.
			</>
		),
		caseStudy: false,
	},
	{
		id: 'matilda',
		href: '/blog/case-studies/matilda',
		src: '/images/case-studies/matilda-hero.png',
		logo: '/images/case-studies/matilda-logo.svg',
		content: (
			<>
				<b>Matilda</b> unified their app experience with tldraw.
			</>
		),
		caseStudy: false,
	},
	{
		id: 'opennote',
		href: '/blog/case-studies/opennote',
		src: '/images/case-studies/opennote-hero.png',
		logo: '/images/case-studies/opennote-logo.svg',
		content: (
			<>
				<b>Opennote</b> added a whiteboard as input to their AI assistant.
			</>
		),
		caseStudy: false,
	},
	// {
	// 	id: 'glean',
	// 	href: '/blog/case-studies/glean',
	// 	src: '/images/case-studies/glean-hero.png',
	// 	logo: '/images/case-studies/glean-logo.svg',
	// 	content: (
	// 		<>
	// 			<b>Glean</b> added visual note-taking to their app for students.
	// 		</>
	// 	),
	// 	caseStudy: false,
	// },
	{
		id: 'graze',
		href: '/blog/case-studies/graze',
		src: '/images/case-studies/graze-hero.png',
		logo: '/images/case-studies/graze-logo.svg',
		content: (
			<>
				<b>Graze</b> created a drag and drop feed designer for Bluesky.
			</>
		),
		caseStudy: false,
	},
	{
		id: 'sublime',
		href: '/blog/case-studies/sublime',
		src: '/images/case-studies/sublime-hero.png',
		logo: '/images/case-studies/sublime-logo.svg',
		content: (
			<>
				<b>Sublime</b> added a board view to their knowledge management app.
			</>
		),
		caseStudy: false,
	},
]

export function CaseStudiesSection() {
	return (
		<Section className="w-full max-w-[100%]" id="case-studies">
			<div className="max-w-6xl mx-auto">
				<SectionTitle>Made with tldraw</SectionTitle>
				<SectionSubtitle>
					The tldraw SDK is used in world-class applications across productivity, education, design,
					and more.
				</SectionSubtitle>
				<div>
					<CaseStudiesGridBig>
						{caseStudiesBig.map((study) => (
							<CaseStudyJustLogoSmallCard
								key={study.id}
								id={study.id}
								href={study.href}
								src={study.src}
								logo={study.logo}
								caseStudy={study.caseStudy}
							>
								{study.content}
							</CaseStudyJustLogoSmallCard>
						))}
					</CaseStudiesGridBig>
					<CaseStudiesGridSmall>
						{caseStudiesSmall.map((study) => (
							<CaseStudyJustLogoSmallCard
								key={study.id}
								id={study.id}
								href={study.href}
								src={study.src}
								logo={study.logo}
								caseStudy={study.caseStudy}
							>
								{study.content}
							</CaseStudyJustLogoSmallCard>
						))}
					</CaseStudiesGridSmall>
				</div>
			</div>
		</Section>
	)
}

function CaseStudyJustLogoSmallCard({
	children,
	id,
	src,
	href,
	logo,
	caseStudy,
}: {
	children: ReactNode
	id: string
	src: string
	href: string
	logo: string
	caseStudy: boolean
}) {
	return (
		<div className="group/link" id={id}>
			<CaseStudyCardContainer>
				<CaseStudyImage src={src} />
				{caseStudy ? (
					<Link href={href}>
						<CaseStudyLogoBig src={logo} />
					</Link>
				) : (
					<CaseStudyLogoBig src={logo} />
				)}
			</CaseStudyCardContainer>
			<CaseStudyCopy href={href} caseStudy={caseStudy}>
				{children}
			</CaseStudyCopy>
		</div>
	)
}

function CaseStudyCardContainer({ children }: { children: ReactNode }) {
	return (
		<div
			className={cn(
				'bg-white relative dark:bg-black group transition-all delay-[.05s] overflow-hidden rounded-lg h-[160px] md:h-auto sm:aspect-video w-full',
				'border border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-400 group-dark:border-zinc-600'
			)}
		>
			{children}
		</div>
	)
}

function CaseStudyImage({ src }: { src: string }) {
	return (
		<div
			className="absolute inset-0 z-[1] opacity-[0] group-hover/link:opacity-[1] bg-white dark:bg-black bg-cover transition-all delay-[.05s]"
			style={{ backgroundImage: `url(${src})` }}
		/>
	)
}

function CaseStudyCopy({
	children,
	caseStudy,
	href,
}: {
	children: ReactNode
	caseStudy: boolean
	href: string
}) {
	return (
		<p className="pt-5 px-0">
			{children}
			{caseStudy ? (
				<>
					{' '}
					Read the{' '}
					<Link
						href={href}
						className="text-blue-600 dark:text-blue-400 sm:text-zinc-800 sm:group-hover/link:text-blue-600 sm:dark:group-hover/link:text-blue-400"
					>
						case study
					</Link>
					.
				</>
			) : null}
		</p>
	)
}

function CaseStudyLogoBig({ src }: { src: string }) {
	return (
		<div className="absolute inset-0 z-[2] flex items-center justify-center opacity-[1] group-hover/link:opacity-[0] transition-all delay-[.05s]">
			<div className="flex-shrink-0">
				<MaskedLogo src={src} />
			</div>
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
