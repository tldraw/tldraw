import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { cn } from '@/utils/cn'
import Image from 'next/image'
import CraftLogo from '../../public/images/case-studies/craft-logo.png'
import Craft from '../../public/images/case-studies/craft.jpg'
import FormaLogo from '../../public/images/case-studies/forma-logo.png'
import Forma from '../../public/images/case-studies/forma.jpg'
import JamLogo from '../../public/images/case-studies/jam-logo.png'
import Jam from '../../public/images/case-studies/jam.jpg'
import PixelpaperLogo from '../../public/images/case-studies/pixelpaper-logo.png'
import Pixelpaper from '../../public/images/case-studies/pixelpaper.jpg'
import PlaygroundLogo from '../../public/images/case-studies/playground-logo.png'
import Playground from '../../public/images/case-studies/playground.jpg'
import { Card } from './card'

export function CaseStudiesSection() {
	return (
		<Section>
			<SectionHeading
				subheading="Case Studies"
				heading="Used by the best"
				description="Great products choose tldraw for whiteboards, design tools, image annotation, generative content, and more."
			/>
			<div className="grid grid-cols-6 gap-x-8 gap-y-12 md:gap-y-8">
				{caseStudies.map(({ logo, screenshot, name }, index) => (
					<div
						key={index}
						className={cn(
							'flex gap-4',
							index < 2
								? 'col-span-6 md:col-span-3 flex-col'
								: 'col-span-6 md:col-span-2 flex-col md:flex-col-reverse'
						)}
					>
						<Image src={logo} alt={`${name} Logo`} className="h-8 w-auto mx-auto" />
						<Card darker>
							<Image src={screenshot} alt={`${name} x tldraw`} className="w-full h-auto" />
						</Card>
					</div>
				))}
			</div>
		</Section>
	)
}

const caseStudies = [
	{ logo: CraftLogo, screenshot: Craft, name: 'Craft' },
	{ logo: PlaygroundLogo, screenshot: Playground, name: 'Playground' },
	{ logo: PixelpaperLogo, screenshot: Pixelpaper, name: 'Pixelpaper' },
	{ logo: FormaLogo, screenshot: Forma, name: 'Autodesk Forma' },
	{ logo: JamLogo, screenshot: Jam, name: 'Jam' },
]
