import Image from 'next/image'
import FeaturesRichMedia from '../../public/images/features/media.png'
import FeaturesMultiplayer from '../../public/images/features/multiplayer.png'
import FeaturesPerformance from '../../public/images/features/performance.png'
import FeaturesReact from '../../public/images/features/react.png'
import FeaturesShapes from '../../public/images/features/shapes.png'
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
			<div className="grid grid-cols-6 gap-x-8 sm:gap-y-8">
				<Card className="col-span-6 md:col-span-3">
					<div className="relative p-5 pb-8 lg:px-10 lg:py-9">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">React canvas</h3>
						<p className="max-w-xs">
							Everything on the tldraw canvas is its own React component. If you can do it on the
							web, you can now do it on the canvas too.
						</p>
					</div>
					<Image
						src={FeaturesReact}
						alt="React canvas"
						className="w-3/4 mx-auto mb-9 max-w-80 xl:mr-8 xl:-mt-32"
					/>
				</Card>
				<Card className="col-span-6 md:col-span-3">
					<div className="flex flex-col justify-between h-full">
						<div className="relative p-5 pb-8 lg:px-10 lg:py-9">
							<h3 className="text-black font-black text-xl md:text-2xl mb-4">High performance</h3>
							<p className="max-w-xs">
								Create and edit thousands of objects. We&apos;ve tuned performance for desktop,
								tablets, and mobile devices.
							</p>
						</div>
						<Image
							src={FeaturesPerformance}
							alt="High performance"
							className="w-full xl:absolute xl:bottom-0"
						/>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<div className="relative p-5 pb-8 lg:px-10 lg:py-9">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">
							Real-time collaborative
						</h3>
						<p className="max-w-xs">
							Create shared experiences with real-time collaboration, live cursors, viewport
							following and cursor chat. Go live with tldraw sync or bring your own backend.
						</p>
					</div>
					<Image
						src={FeaturesMultiplayer}
						alt="Real-time collaborative"
						className="w-2/3 mx-auto mb-9 max-w-64 xl:mr-8 xl:max-w-52 xl:-mt-4"
					/>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<div className="flex flex-col justify-between h-full">
						<div className="relative p-5 pb-8 lg:px-10 lg:py-9">
							<h3 className="text-black font-black text-xl md:text-2xl mb-4">Media and more</h3>
							<p className="max-w-xs">
								Drop in images, videos, and even other websites to add them to the canvas. Paste
								URLs to create interactive bookmarks. Export images and data.
							</p>
						</div>
						<Image
							src={FeaturesRichMedia}
							alt="Media and more"
							className="w-5/6 mx-auto mb-9 max-w-80"
						/>
					</div>
				</Card>
				<Card className="col-span-6 md:col-span-2">
					<div className="relative p-5 pb-8 lg:px-10 lg:py-9">
						<h3 className="text-black font-black text-xl md:text-2xl mb-4">Make it yours</h3>
						<p className="max-w-xs">
							Highly hackable and built for customization. Create your own custom shapes, tools, and
							user interface. Use the runtime API to drive the canvas.
						</p>
					</div>
					<Image
						src={FeaturesShapes}
						alt="Make it yours"
						className="w-1/2 mx-auto -mb-12 max-w-40 xl:-mt-4 xl:-mb-14 xl:mr-12"
					/>
				</Card>
			</div>
		</Section>
	)
}
