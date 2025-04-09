import Link from 'next/link'
import { MaskedLogo } from './masked-logo'

export function LogoSection() {
	return (
		<section className="flex w-full max-w-screen-xl mx-auto gap-6 px-2 flex-col items-center text-[#000] dark:text-[#fff] opacity-[.7]">
			<Link
				className="w-full flex flex-wrap max-w-xl items-center justify-center lg:justify-center gap-x-5"
				href="#case-studies"
			>
				{logos.map((section) => (
					<>
						{section.map(({ src }, index) => (
							<MaskedLogo key={index} src={src} small />
						))}
					</>
				))}
			</Link>
			{/* <div className="w-full hidden xl:flex flex-wrap items-center justify-center lg:justify-center gap-0">
				{logos.map((section, i) => (
					<>
						{section.map(({ src, alt, url }, index) => (
							<MaskedLogoLink key={index} src={src} url={url} alt={alt} small={i > 0} />
						))}
					</>
				))}
			</div>
			<div className="w-full flex xl:hidden flex-wrap max-w-xl items-center justify-center lg:justify-center gap-0">
				{logos.map((section, i) => (
					<>
						{section.map(({ src, alt, url }, index) => (
							<MaskedLogoLink key={index} src={src} url={url} alt={alt} small={i > 0} />
						))}
					</>
				))}
			</div> */}
			{/* <div className="text-sm text-zinc-800">Incredible things are happening on the canvas.</div> */}
		</section>
	)
}

const logos: {
	src: string
	alt: string
	url: string
}[][] = [
	[
		{
			src: '/images/case-studies/autodesk-logo.svg',
			alt: 'Autodesk',
			url: 'https://www.autodesk.com/products/forma',
		},
		{
			src: '/images/case-studies/clickup-logo.svg',
			alt: 'ClickUp',
			url: 'https://clickup.com/',
		},
		{
			src: '/images/case-studies/craft-logo.svg',
			alt: 'Craft',
			url: 'https://www.craft.do/',
		},
		{
			src: '/images/case-studies/jam-logo.svg',
			alt: 'Jam.dev',
			url: 'https://jam.dev/',
		},
		{
			src: '/images/case-studies/axa-logo.svg',
			alt: 'Axa',
			url: 'https://www.axa.com/',
		},
	],
	[
		{
			src: '/images/case-studies/glean-logo.svg',
			alt: 'Glean',
			url: 'https://glean.co/',
		},
		{
			src: '/images/case-studies/roam-logo.svg',
			alt: 'Roam',
			url: 'https://ro.am/',
		},
		{
			src: '/images/case-studies/padlet-logo.svg',
			alt: 'Padlet',
			url: 'https://padlet.com/',
		},
		{
			src: '/images/case-studies/bigbluebutton-logo.svg',
			alt: 'Big Blue Button',
			url: 'https://bigbluebutton.org/',
		},
		// {
		// 	src: '/images/case-studies/legendkeeper-logo.svg',
		// 	alt: 'Legend Keeper',
		// 	url: 'https://legendkeeper.com/',
		// },
		// {
		// 	src: '/images/case-studies/formitize-logo.svg',
		// 	alt: 'Formitize',
		// 	url: 'https://formitize.com/',
		// },
		// {
		// 	src: '/images/case-studies/cadchat-logo.svg',
		// 	alt: 'Cadchat',
		// 	url: 'https://cadchat.com/',
		// },
		// {
		// 	src: '/images/case-studies/encube-logo.svg',
		// 	alt: 'Encube',
		// 	url: 'https://getencube.com/',
		// },
		// {
		// 	src: '/images/case-studies/pixelpaper-logo.svg',
		// 	alt: 'Pixelpaper',
		// 	url: 'https://pixelpaper.io/',
		// },
		// {
		// 	src: '/images/case-studies/matilda-logo.svg',
		// 	alt: 'Matilda Workspace',
		// 	url: 'https://matilda.io/',
		// },
		// {
		// 	src: '/images/case-studies/fevtutor-logo.svg',
		// 	alt: 'Fev tutor',
		// 	url: 'https://fevtutor.com/',
		// },
	],
]
