import {
	ArrowUturnUpIcon,
	Bars3BottomLeftIcon,
	MoonIcon,
	PencilIcon,
} from '@heroicons/react/24/solid'
import { Section } from './section'
import { SectionHeading } from './section-heading'

export function DetailsSection() {
	return (
		<Section>
			<SectionHeading
				subheading="details"
				heading="Beautiful software"
				description="Carefully considered details that turn table-stakes features into best-in-class user experience."
			/>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-5">
				{details.map(({ icon, heading, description }, index) => {
					const Icon = icon
					return (
						<div key={index}>
							<div className="flex items-center gap-2 mb-4 justify-center sm:justify-start ">
								<Icon className="size-5 text-blue-500" />
								<h3 className="text-black dark:text-white font-black text-xl">{heading}</h3>
							</div>
							<p className="text-center sm:max-w-md sm:text-start">{description}</p>
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
		heading: 'Perfect ink',
		description:
			'Create beautiful, pressure-sensitive freehand lines with the pen tool, powered by our custom algorithm for virtual ink.',
	},
	{
		icon: ArrowUturnUpIcon,
		heading: 'Perfect arrows',
		description:
			'Linking lines never looked so good. Customize arrowheads and create beautiful curves between shapes, notes, and more.',
	},
	{
		icon: MoonIcon,
		heading: 'Dark Mode',
		description:
			'Switch between full light and dark mode themes that affect menus, shapes, and even image exports.',
	},
	{
		icon: Bars3BottomLeftIcon,
		heading: 'Works everywhere',
		description:
			'High performance in all modern browsers and on desktop, tablet, and mobile devices. Quality constantly maintained.',
	},
]
