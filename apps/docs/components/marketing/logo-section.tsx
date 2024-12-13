import { MaskedLogo } from './masked-logo'

export function LogoSection() {
	return (
		<>
			<section className="hidden sm:flex w-full max-w-screen-xl mx-auto px-2 lg:px-5 text-base flex-col items-center text-[#000] dark:text-[#fff]">
				<div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-center lg:justify-center gap-0">
					{logos[0].map(({ src, alt, url }, index) => (
						<MaskedLogo key={index} src={src} url={url} alt={alt} />
					))}
				</div>
				<div className="w-full flex flex-wrap w-[80%] lg:w-[80%] items-center justify-center lg:justify-center gap-x-0 gap-y-5">
					{logos[1].map(({ src, alt, url }, index) => (
						<MaskedLogo key={index} src={src} url={url} alt={alt} small />
					))}
				</div>
				<h2 className="text-center text-sm mt-8">
					The best product teams build their canvas with tldraw.
				</h2>
			</section>
			<section className="flex sm:hidden w-full max-w-screen-xl mx-auto px-2 pt-4 flex-col items-center text-[#000] dark:text-[#fff]">
				<div className="w-full flex flex-wrap items-center justify-center lg:justify-center gap-0">
					{logos.map((section, i) => (
						<>
							{section.map(({ src, alt, url }, index) => (
								<MaskedLogo key={index} src={src} url={url} alt={alt} small={i > 0} />
							))}
						</>
					))}
				</div>
				<h2 className="text-center text-sm mt-8">
					The best product teams trust their canvas with tldraw.
				</h2>
			</section>
		</>
	)
}

const logos: {
	src: string
	alt: string
	url: string
}[][] = [
	[
		{
			src: '/images/logos/autodesk-logo.svg',
			alt: 'Autodesk',
			url: 'https://www.autodesk.com/products/forma',
		},
		{
			src: '/images/logos/clickup-logo.svg',
			alt: 'ClickUp',
			url: 'https://clickup.com/',
		},
		{
			src: '/images/logos/craft-logo.svg',
			alt: 'Craft',
			url: 'https://www.craft.do/',
		},
		{
			src: '/images/logos/jam-logo.svg',
			alt: 'Jam.dev',
			url: 'https://jam.dev/',
		},
		{
			src: '/images/logos/axa-logo.svg',
			alt: 'Axa',
			url: 'https://www.axa.com/',
		},
	],
	[
		{
			src: '/images/logos/glean-logo.svg',
			alt: 'Glean',
			url: 'https://glean.co/',
		},
		{
			src: '/images/logos/roam-logo.svg',
			alt: 'Roam',
			url: 'https://ro.am/',
		},
		{
			src: '/images/logos/padlet-logo.svg',
			alt: 'Padlet',
			url: 'https://padlet.com/',
		},
		{
			src: '/images/logos/bigbluebutton-logo.svg',
			alt: 'Big Blue Button',
			url: 'https://bigbluebutton.org/',
		},
		// {
		// 	src: '/images/logos/legendkeeper-logo.svg',
		// 	alt: 'Legend Keeper',
		// 	url: 'https://legendkeeper.com/',
		// },
		// {
		// 	src: '/images/logos/formitize-logo.svg',
		// 	alt: 'Formitize',
		// 	url: 'https://formitize.com/',
		// },
		// {
		// 	src: '/images/logos/cadchat-logo.svg',
		// 	alt: 'Cadchat',
		// 	url: 'https://cadchat.com/',
		// },
		// {
		// 	src: '/images/logos/encube-logo.svg',
		// 	alt: 'Encube',
		// 	url: 'https://getencube.com/',
		// },
		// {
		// 	src: '/images/logos/pixelpaper-logo.svg',
		// 	alt: 'Pixelpaper',
		// 	url: 'https://pixelpaper.io/',
		// },
		// {
		// 	src: '/images/logos/matilda-logo.svg',
		// 	alt: 'Matilda Workspace',
		// 	url: 'https://matilda.io/',
		// },
		// {
		// 	src: '/images/logos/fevtutor-logo.svg',
		// 	alt: 'Fev tutor',
		// 	url: 'https://fevtutor.com/',
		// },
	],
]
