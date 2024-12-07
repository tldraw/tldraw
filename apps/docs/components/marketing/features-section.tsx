import { Card } from '@/components/marketing/card'
import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import FeaturesRichMedia from '@/public/images/features/media.png'
import FeaturesMultiplayer from '@/public/images/features/multiplayer.png'
import FeaturesPerformance from '@/public/images/features/performance.png'
import FeaturesReact from '@/public/images/features/react.png'
import FeaturesShapes from '@/public/images/features/shapes.png'
import Image from 'next/image'
import Link from 'next/link'

export function FeaturesSection() {
	return (
		<Section id="features">
			<SectionHeading
				subheading="features"
				heading="Made for developers"
				description="We've designed the tldraw SDK to be a solid foundation for developers: built for the web, packed with table-stakes features, and designed for extensibility."
			/>
			<div className="grid grid-cols-6 gap-x-8 sm:gap-y-8">
				<Card className="col-span-6 md:col-span-3">
					<div className="relative p-5 pb-8 lg:px-10 lg:py-9">
						<h3 className="text-black dark:text-white font-black text-xl md:text-2xl mb-4">
							React canvas
						</h3>
						<p className="max-w-xs">
							The tldraw canvas and everything on it is its own React component, rendered in regular
							HTML and CSS. If you can do it on the web, you can now do it on the canvas too.
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
							<h3 className="text-black dark:text-white font-black text-xl md:text-2xl mb-4">
								High performance
							</h3>
							<p className="max-w-xs">
								Create, edit, and manipulate thousands of objects, including images, interactive
								components, and embedded content. Highly optimized for performance on desktop,
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
						<h3 className="text-black dark:text-white font-black text-xl md:text-2xl mb-4">
							Real-time collaboration
						</h3>
						<p className="max-w-xs">
							Go live with{' '}
							<Link className="text-blue-500" href="/docs/sync">
								tldraw sync
							</Link>{' '}
							or bring your own backend for shared experiences. Built-in support for collaborative
							editing, live cursors, viewport following and cursor chat.
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
							<h3 className="text-black dark:text-white font-black text-xl md:text-2xl mb-4">
								Media and more
							</h3>
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
						<h3 className="text-black dark:text-white font-black text-xl md:text-2xl mb-4">
							Customization
						</h3>
						<p className="max-w-xs">
							Create your own custom elements, tools, interactions, and user interface. Use the
							runtime{' '}
							<Link className="text-blue-500" href="/docs/editor">
								Editor API
							</Link>{' '}
							to control the canvas.
						</p>
					</div>
					<Image
						src={FeaturesShapes}
						alt="Customization"
						className="w-1/2 mx-auto -mb-12 max-w-40 xl:-mt-4 xl:-mb-14 xl:mr-12"
					/>
				</Card>
			</div>
		</Section>
	)
}
