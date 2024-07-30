import Image from 'next/image'
import FeaturesMultiplayer from '../../public/images/features/features-multiplayer.jpg'
import FeaturesPerformance from '../../public/images/features/features-performance.jpg'
import FeaturesReact from '../../public/images/features/features-react.jpg'
import FeaturesRichMedia from '../../public/images/features/features-rich-media.jpg'
import FeaturesShapes from '../../public/images/features/features-shapes.jpg'
import { Card } from './card'
import { Section } from './section'
import { SectionHeading } from './section-heading'

export const FeaturesSection = () => {
	return (
		<Section>
			<SectionHeading
				subheading="Features"
				heading="The Feature Complete Whiteboard"
				description="Wether you’re looking for a drop-in whiteboard or a starting point for your own canvas, tldraw has you covered."
			/>
			<div className="grid grid-cols-6 gap-x-8 md:gap-y-8">
				<Card className="col-span-6 md:col-span-3">
					<Image
						src={FeaturesReact}
						alt="Based on React"
						className="absolute bottom-4 right-8 w-1/2"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">Based on React</h3>
						<p className="max-w-xs">
							Every shape on the canvas is a React component, meaning anything that’s possible on
							the web -<br className="lg:hidden" />
							tldraw can do it too.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-3">
					<Image
						src={FeaturesPerformance}
						alt="Performance Guaranteed"
						className="absolute bottom-0 right-0 w-5/6"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">
							Performance Guaranteed
						</h3>
						<p className="max-w-xs">
							Try moving 100 objects – minimal latency and smooth multiplayer experience come
							guaranteed with tldraw.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<Image
						src={FeaturesMultiplayer}
						alt="Built-in Multiplayer"
						className="absolute bottom-5 right-7 w-1/2"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">Built-in Multiplayer</h3>
						<p className="max-w-xs">
							Tldraw supports user names, viewport following and cursor chat, enabling you to build
							great multiplayer experiences.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<Image
						src={FeaturesRichMedia}
						alt="Rich Media"
						className="absolute bottom-4 right-8 w-5/6"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">Rich Media</h3>
						<p className="max-w-xs">
							Drop in files to add them to the canvas, no server needed. Paste URLs to create
							interactive bookmarks.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<Image
						src={FeaturesShapes}
						alt="Custom Shapes"
						className="absolute -bottom-12 right-4 w-1/2"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">Custom Shapes</h3>
						<p className="max-w-xs">
							In addition to the 16+ default shapes, the tldraw APIs allow you to add your own
							custom shapes.
						</p>
					</div>
				</Card>
			</div>
		</Section>
	)
}
