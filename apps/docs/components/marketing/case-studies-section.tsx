import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { LogoSection } from './logo-section'

export function CaseStudiesSection() {
	return (
		<Section>
			<SectionHeading
				subheading="Customers"
				heading="Made with tldraw"
				description="Great products choose tldraw to build whiteboards, design tools, education apps, and more."
			/>
			{/* <div className="grid grid-cols-6 gap-x-8 gap-y-12 md:gap-y-8">
				{caseStudies.map(({ logo, screenshot, name, url }, index) => (
					<Link
						key={index}
						href={url ?? '/'}
						className={cn(
							'flex gap-4',
							index < 2
								? 'col-span-6 md:col-span-3 flex-col'
								: 'col-span-6 md:col-span-2 flex-col md:flex-col-reverse'
						)}
					>
						<Card darker>
							<Image src={screenshot} alt={`${name} x tldraw`} className="w-full h-auto" />
						</Card>
					</Link>
				))}
			</div> */}
			<LogoSection />
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
