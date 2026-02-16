import { ComponentType } from 'react'

export interface Example {
	title: string
	path: string
	codeUrl: string
	category: Category
	priority: number
	keywords: string[]
	multiplayer: boolean
	loadComponent(): Promise<ComponentType<{ roomId?: string }>>
	loadContent(): Promise<{ description: string; details: string }>
}

const categories = [
	['getting-started', 'Getting started'],
	['configuration', 'Configuration'],
	['editor-api', 'Editor API'],
	['ui', 'UI & theming'],
	['layout', 'Page layout'],
	['events', 'Events & effects'],
	['shapes/tools', 'Shapes & tools'],
	['collaboration', 'Collaboration'],
	['data/assets', 'Data & assets'],
	['use-cases', 'Use cases'],
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

export const examples = categories.map(([category, title]) => ({
	id: title,
	value: getExamplesForCategory(category as Category),
}))
