import { Example } from '@/components/marketing/example'
import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import {
	ArrowLongRightIcon,
	CursorArrowRaysIcon,
	EyeSlashIcon,
	SparklesIcon,
	WrenchIcon,
} from '@heroicons/react/20/solid'
import Link from 'next/link'
import { ArrowUp } from './arrow-up'

export async function CustomizationSection() {
	return (
		<Section>
			<SectionHeading
				subheading="Features"
				heading="100% Customizable"
				description="Make the canvas 100% yours with tldraw. Here are a few examples of how to do that."
			/>
			<TabGroup>
				<TabList className="relative flex sm:justify-center overflow-x-auto gap-8 mb-12 px-5">
					<div className="absolute inset-x-0 bottom-0 h-px bg-zinc-100 dark:bg-zinc-800" />
					{examples.map(({ icon, name }, index) => {
						const Icon = icon
						return (
							<Tab
								key={index}
								className="relative flex items-center gap-2 pb-2 whitespace-nowrap border-b border-b-transparent data-[selected]:border-blue-500 data-[selected]:text-blue-500 data-[selected]:font-semibold"
							>
								<Icon className="size-4 shrink-0" />
								<span>{name}</span>
							</Tab>
						)
					})}
				</TabList>
				<TabPanels>
					{examples.map(({ example, description }, index) => (
						<TabPanel key={index}>
							<p className="text-center px-5 md:px-0 mx-auto mb-12">
								<span>{description}</span>
								<Link
									href={example}
									className="inline-flex ml-2 gap-1 items-center text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
								>
									<span>See Docs</span>
									<ArrowLongRightIcon className="size-4" />
								</Link>
							</p>
							<Example path={example} showPlaceholder={index === 0} />
						</TabPanel>
					))}
				</TabPanels>
			</TabGroup>
			<div className="font-hand text-blue-500 text-lg flex justify-center items-end">
				<span>try right here</span>
				<ArrowUp className="h-20 -ml-4 -mb-1 -mt-4" />
			</div>
		</Section>
	)
}

const examples = [
	{
		icon: SparklesIcon,
		name: 'Custom UI',
		description: 'Add your own, styled UI to control what users can do on your canvas.',
		example: '/examples/ui/custom-ui',
	},
	{
		icon: EyeSlashIcon,
		name: 'Hide UI',
		description: 'You can hide the default tldraw user interface entirely to get a blank canvas.',
		example: '/examples/ui/hide-ui',
	},
	{
		icon: WrenchIcon,
		name: 'Custom Tools',
		description:
			'Build your own tools to use inside the canvas. Here’s a screenshot tool for example.',
		example: '/examples/shapes/tools/screenshot-tool',
	},
	{
		icon: CursorArrowRaysIcon,
		name: 'Interactive Shapes',
		description:
			'You can handle events inside your custom shapes. See this ToDo shape for example.',
		example: '/examples/shapes/tools/interactive-shape',
	},
]
