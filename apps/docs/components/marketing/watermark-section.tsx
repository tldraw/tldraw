import { BlueA } from '../common/blue-a'
import { Section } from './section'
import { SectionHeading } from './section-heading'
import { WatermarkImage } from './watermark-image'

export function WatermarkSection() {
	return (
		<Section
			id="license"
			className="bg-zinc-50 dark:bg-zinc-900 py-24 sm:py-24 md:py-32 lg:py-40 w-full max-w-full"
		>
			<SectionHeading subheading="License" heading="Free with Watermark" />
			<div className="flex justify-center mb-8">
				<WatermarkImage />
			</div>
			<p className="text-center max-w-xl text-balance mx-auto px-5 md:px-0">
				You can use the tldraw SDK for free in your project—even in a commercial project—as long as
				the <b>made with tldraw</b> watermark is present. See{' '}
				<BlueA href="https://github.com/tldraw/tldraw/blob/main/LICENSE.md">
					our standard license
				</BlueA>{' '}
				to learn more.
			</p>
			<p className="text-center max-w-xl text-balance mx-auto px-5 pt-4 md:px-0">
				<BlueA href="#pricing">Our customers</BlueA> receive a license key to hide the watermark.
			</p>
		</Section>
	)
}
