export function LogoSection() {
	return (
		<section className="w-full max-w-screen-xl mx-auto px-5 pt-16 sm:pt-20 text-sm sm:text-base">
			<h2 className="text-center mb-8">Trusted by great teams around the globe:</h2>
			<div className="flex flex-wrap items-center justify-center lg:justify-between gap-8">
				{logos.map(({ src, alt }, index) => (
					<img key={index} src={src} alt={alt} className="h-6 w-auto" />
				))}
			</div>
		</section>
	)
}

const logos = [
	{
		src: '/logos/switchboard.jpg',
		alt: 'Switchboard Logo',
	},
	{
		src: '/logos/roam.jpg',
		alt: 'Roam Logo',
	},
	{
		src: '/logos/gamma.jpg',
		alt: 'Gamma Logo',
	},
	{
		src: '/logos/logo-3.jpg',
		alt: 'Logo 3',
	},
	{
		src: '/logos/centricsoftware.jpg',
		alt: 'CentricSoftware Logo',
	},
	{
		src: '/logos/logo-2.jpg',
		alt: 'Logo 2',
	},
	{
		src: '/logos/doozy.jpg',
		alt: 'Doozy Logo',
	},
]
