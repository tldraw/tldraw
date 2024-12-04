export function LogoSection() {
	return (
		<section className="w-full max-w-screen-xl mx-auto px-2 lg:px-5 pt-16 sm:pt-20 text-sm sm:text-base">
			<h2 className="text-center mb-8">Trusted by great teams around the globe:</h2>
			<div className="flex flex-wrap items-center justify-center lg:justify-center gap-0">
				{logos.map(({ src, alt }, index) => (
					<img key={index} src={src} alt={alt} className="lg:h-[120px] h-[80px] w-auto" />
				))}
			</div>
		</section>
	)
}

const logos = [
	{
		src: '/images/logos/autodesk-logo.svg',
		alt: 'Autodesk',
	},
	{
		src: '/images/logos/clickup-logo.svg',
		alt: 'ClickUp',
	},
	{
		src: '/images/logos/craft-logo.svg',
		alt: 'Craft',
	},
	{
		src: '/images/logos/glean-logo.svg',
		alt: 'Glean',
	},
	{
		src: '/images/logos/axa-logo.svg',
		alt: 'Axa',
	},
	{
		src: '/images/logos/jam-logo.svg',
		alt: 'Jam.dev',
	},
	{
		src: '/images/logos/padlet-logo.svg',
		alt: 'Padlet',
	},
	{
		src: '/images/logos/legendkeeper-logo.svg',
		alt: 'Legend Keeper',
	},
	{
		src: '/images/logos/formitize-logo.svg',
		alt: 'Formitize',
	},
	{
		src: '/images/logos/roam-logo.svg',
		alt: 'Roam',
	},
	{
		src: '/images/logos/cadchat-logo.svg',
		alt: 'Cadchat',
	},
	{
		src: '/images/logos/bbb-logo.svg',
		alt: 'Big Blue Button',
	},
	{
		src: '/images/logos/encube-logo.svg',
		alt: 'Encube',
	},
	{
		src: '/images/logos/pixelpaper-logo.svg',
		alt: 'Pixelpaper',
	},
	{
		src: '/images/logos/matilda-logo.svg',
		alt: 'Matilda Workspace',
	},
	{
		src: '/images/logos/fev-logo.svg',
		alt: 'Fev tutor',
	},
]
