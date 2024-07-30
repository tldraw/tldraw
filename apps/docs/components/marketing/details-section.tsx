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
				{details.map(({ icon, heading, description }, index) => {
					const Icon = icon
					return (
						<div key={index}>
							<div className="flex items-center gap-2 mb-4">
								<Icon className="size-5 text-blue-500" />
								<h3 className="text-black font-black text-xl">{heading}</h3>
							</div>
							<p className="max-w-md">{description}</p>
						</div>
					)
				})}
			</div>
		</Section>
	)
}

const details = [
	{
		icon: PencilIcon,
		heading: 'Best Pencil Tool',
		description:
			'Create beautiful, pressure-sensitive freehand lines with the pen tool, powered by our custom algorithm for virtual ink.',
	},
	{
		icon: ArrowUturnUpIcon,
		heading: 'Perfect Arrows',
		description:
			'Linking lines never looked so good. Customize arrowheads and create beautiful curves between shapes, notes, and more.',
	},
	{
		icon: MoonIcon,
		heading: 'Dark Mode',
		description:
			'Tldraw comes with full light and dark mode support that effect menus, shapes, and even image exports.',
	},
	{
		icon: Bars3BottomLeftIcon,
		heading: 'Rich Text',
		description:
			'Auto-sizing text fields that support headers, code blocks, lists, and rich text styles. Markdown syntax? Got you.',
	},
]
