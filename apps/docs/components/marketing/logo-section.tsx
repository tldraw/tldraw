import Link from 'next/link'
import { MaskedLogo } from './masked-logo'

export function LogoSection() {
	return (
		<section className="group relative h-[100px] w-full max-w-screen-xl flex flex-col gap-6 text-[#000] dark:text-[#fff]">
			<div className="absolute inset-0 w-full flex flex-wrap max-w-xl mx-auto items-center justify-center gap-x-5 px-5 sm:px-2 opacity-[.32] group-hover:opacity-[.05] transition-all delay-[.025s] group-hover:blur-md">
				{logos.map((section) => (
					<>
						{section.map(({ src }, index) => (
							<MaskedLogo key={index} src={src} small />
						))}
					</>
				))}
			</div>
			<Link
				href="#case-studies"
				className="absolute inset-0 w-full flex items-center justify-center font-semibold opacity-0 group-hover:opacity-100 transition-all delay-[.05s] text-zinc-800 dark:text-zinc-200"
			>
				See our case studies
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
			src: '/images/case-studies/mobbin-logo.svg',
			alt: 'Autodesk',
			url: 'https://www.mobbin.com',
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
