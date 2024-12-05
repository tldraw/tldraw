import Link from 'next/link'

// todo: use masking to use current color

export function LogoSection() {
	return (
		<section className="w-full max-w-screen-xl mx-auto px-2 lg:px-5 pt-16 sm:pt-20 text-sm sm:text-base">
			<h2 className="text-center mb-8">Our real customers:</h2>
			<div className="flex flex-wrap items-center justify-center lg:justify-center gap-0">
				{logos.map(({ src, alt, url }, index) => (
					<Link key={index} href={url} title={alt} target="_blank">
						<img src={src} alt={alt} className="lg:h-[120px] h-[80px] w-auto" />
					</Link>
				))}
			</div>
		</section>
	)
}

const logos: {
	src: string
	alt: string
	url: string
}[] = [
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
		src: '/images/logos/glean-logo.svg',
		alt: 'Glean',
		url: 'https://glean.co/',
	},
	{
		src: '/images/logos/axa-logo.svg',
		alt: 'Axa',
		url: 'https://www.axa.com/',
	},
	{
		src: '/images/logos/jam-logo.svg',
		alt: 'Jam.dev',
		url: 'https://jam.dev/',
	},
	{
		src: '/images/logos/padlet-logo.svg',
		alt: 'Padlet',
		url: 'https://padlet.com/',
	},
	{
		src: '/images/logos/legendkeeper-logo.svg',
		alt: 'Legend Keeper',
		url: 'https://legendkeeper.com/',
	},
	{
		src: '/images/logos/formitize-logo.svg',
		alt: 'Formitize',
		url: 'https://formitize.com/',
	},
	{
		src: '/images/logos/roam-logo.svg',
		alt: 'Roam',
		url: 'https://ro.am/',
	},
	// {
	// 	src: '/images/logos/cadchat-logo.svg',
	// 	alt: 'Cadchat',
	// 	url: 'https://cadchat.com/',
	// },
	{
		src: '/images/logos/bigbluebutton-logo.svg',
		alt: 'Big Blue Button',
		url: 'https://bigbluebutton.org/',
	},
	{
		src: '/images/logos/encube-logo.svg',
		alt: 'Encube',
		url: 'https://getencube.com/',
	},
	{
		src: '/images/logos/pixelpaper-logo.svg',
		alt: 'Pixelpaper',
		url: 'https://pixelpaper.io/',
	},
	{
		src: '/images/logos/matilda-logo.svg',
		alt: 'Matilda Workspace',
		url: 'https://matilda.io/',
	},
	// {
	// 	src: '/images/logos/fevtutor-logo.svg',
	// 	alt: 'Fev tutor',
	// 	url: 'https://fevtutor.com/',
	// },
]
