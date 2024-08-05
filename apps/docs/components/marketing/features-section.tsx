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
		<Section id="features">
			<SectionHeading
				subheading="Features"
				heading="Feature complete"
				description="We've designed the tldraw SDK to be a solid foundation. It's built for the web and packed with table-stakes features."
			/>
			<div className="grid grid-cols-6 gap-x-8 md:gap-y-8">
				<Card className="col-span-6 md:col-span-3">
					<Image
						src={FeaturesReact}
						alt="React canvas"
						className="absolute bottom-4 right-8 w-1/2"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">React canvas</h3>
						<p className="max-w-xs">
							Everything on the tldraw canvas is its own React component. If you can do it on the
							web, you can now do it on the canvas too.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-3">
					<Image
						src={FeaturesPerformance}
						alt="High performance"
						className="absolute bottom-0 right-0 w-5/6"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">High performance</h3>
						<p className="max-w-xs">
							Create and edit thousands of objects. We&apos;ve tuned performance for desktop,
							tablets, and mobile devices.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<Image
						src={FeaturesMultiplayer}
						alt="Real-time collaborative"
						className="absolute bottom-5 right-7 w-1/2"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">
							Real-time collaborative
						</h3>
						<p className="max-w-xs">
							Create shared experiences with real-time collaboration, live cursors, viewport
							following and cursor chat. Go live with tldraw sync or bring your own backend.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<Image
						src={FeaturesRichMedia}
						alt="Media and more"
						className="absolute bottom-4 right-8 w-5/6"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">Media and more</h3>
						<p className="max-w-xs">
							Drop in images, videos, and even other websites to add them to the canvas. Paste URLs
							to create interactive bookmarks. Export images and data.
						</p>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<Image
						src={FeaturesShapes}
						alt="Make it yours"
						className="absolute -bottom-12 right-4 w-1/2"
					/>
					<div className="relative px-5 md:px-10 pt-9 pb-32">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">Make it yours</h3>
						<p className="max-w-xs">
							Highly hackable and built for customization. Create your own custom shapes, tools, and
							user interface. Use the runtime API to drive the canvas.
						</p>
					</div>
				</Card>
			</div>
		</Section>
	)
}
