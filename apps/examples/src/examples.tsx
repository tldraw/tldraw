import { ComponentType } from 'react'

export interface Example {
	title: string
	path: string
	codeUrl: string
	category: Category
	priority: number
	keywords: string[]
	multiplayer: boolean
	related: string[]
	loadComponent(): Promise<ComponentType<{ roomId?: string }>>
	loadContent(): Promise<{ description: string; details: string }>
}

const categories = [
	['getting-started', 'Getting started', 'Initial set up'],
	[
		'configuration',
		'Configuration',
		'Change tools, defaults, and behaviors to fit your application',
	],
	['editor-api', 'Editor API', 'Control the canvas engine programmatically'],
	['ui', 'UI & theming', 'Replace interface components, add custom toolbars, and style the canvas'],
	['layout', 'Page layout', 'Change the size and position of the canvas on the page'],
	['events', 'Events & effects', 'React to changes on the canvas and add constraints'],
	[
		'shapes/tools',
		'Shapes & tools',
		'Create custom shapes and tools with their own behaviors and interactions',
	],
	[
		'collaboration',
		'Collaboration',
		'Add multiplayer features, sync documents, and control content visibility per user',
	],
	['data/assets', 'Data & assets', 'Import, export, and manage document data'],
	['use-cases', 'Use cases', 'Examples of custom canvas tools and experiences'],
] as const

type Category = (typeof categories)[number][0]

interface ExampleMetaModule {
	meta: Omit<Example, 'loadComponent' | 'loadContent'>
	loadComponent(): Promise<ComponentType<{ roomId?: string }>>
	loadContent(): Promise<{ description: string; details: string }>
}

const allExamples = Object.values(
	import.meta.glob('./examples/**/README.md', { eager: true })
) as ExampleMetaModule[]

const categorySet = new Set(categories.map(([category]) => category))

const sortedExamples = allExamples
	.map((module) => ({
		...module.meta,
		loadComponent: module.loadComponent,
		loadContent: module.loadContent,
	}))
	.map((example) => {
		if (!categorySet.has(example.category)) {
			throw new Error(`Unknown category "${example.category}" for example "${example.title}"`)
		}
		return example
	})

const getExamplesForCategory = (category: Category) =>
	sortedExamples
		.filter((e) => e.category === category)
		.sort((a, b) => {
			if (a.priority === b.priority) return a.title.localeCompare(b.title)
			return a.priority - b.priority
		})

/** Flat lookup of all examples by path (e.g. "/basic") */
export const examplesByPath = new Map(sortedExamples.map((e) => [e.path, e]))

export const examples = categories.map(([category, title, description]) => ({
	id: title,
	description,
	value: getExamplesForCategory(category as Category),
}))
