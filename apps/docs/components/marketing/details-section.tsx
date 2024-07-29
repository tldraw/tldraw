import {
	ArrowUturnUpIcon,
	Bars3BottomLeftIcon,
	MoonIcon,
	PencilIcon,
} from '@heroicons/react/24/solid'
import { Section } from './section'
import { SectionHeading } from './section-heading'

export const DetailsSection = () => {
	return (
		<Section>
			<SectionHeading
				subheading="Features"
				heading="Fine Tuned Details"
				description="From the bending of our arrows to the shadows of our cursors, we obsess over every design detail."
			/>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-5">
				<div>
					<div className="flex items-center gap-2 mb-4">
						<PencilIcon className="size-5 text-blue-500" />
						<h3 className="text-black font-black text-xl">Best Pencil Tool</h3>
					</div>
					<p className="max-w-md">
						Create beautiful, pressure-sensitive freehand lines with the pen tool, powered by our
						custom algorithm for virtual ink.
					</p>
				</div>
				<div>
					<div className="flex items-center gap-2 mb-4">
						<ArrowUturnUpIcon className="size-5 text-blue-500" />
						<h3 className="text-black font-black text-xl">Perfect Arrows</h3>
					</div>
					<p className="max-w-md">
						Linking lines never looked so good. Customize arrowheads and create beautiful curves
						between shapes, notes, and more.
					</p>
				</div>
				<div>
					<div className="flex items-center gap-2 mb-4">
						<MoonIcon className="size-5 text-blue-500" />
						<h3 className="text-black font-black text-xl">Dark Mode</h3>
					</div>
					<p className="max-w-md">
						Tldraw comes with full light and dark mode support that effect menus, shapes, and even
						image exports.
					</p>
				</div>
				<div>
					<div className="flex items-center gap-2 mb-4">
						<Bars3BottomLeftIcon className="size-5 text-blue-500" />
						<h3 className="text-black font-black text-xl">Rich Text</h3>
					</div>
					<p className="max-w-md">
						Auto-sizing text fields that support headers, code blocks, lists, and rich text styles.
						Markdown syntax? Got you.
					</p>
				</div>
			</div>
		</Section>
	)
}
