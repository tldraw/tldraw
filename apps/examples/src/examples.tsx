import { ComponentType } from 'react'

export interface Example {
	title: string
	description: string
	details: string
	path: string
	codeUrl: string
	hide: boolean
	category: Category
	priority: number
	componentFile: string
	keywords: string[]
	multiplayer: boolean
	loadComponent(): Promise<ComponentType<{ roomId?: string }>>
}

type Category =
	| 'basic'
	| 'editor-api'
	| 'ui'
	| 'collaboration'
	| 'data/assets'
	| 'shapes/tools'
	| 'use-cases'

const getExamplesForCategory = (category: Category) =>
	(Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[])
		.filter((e) => e.category === category)
		.sort((a, b) => {
			if (a.priority === b.priority) return a.title.localeCompare(b.title)
			return a.priority - b.priority
		})

const categories = [
	['basic', 'Getting started'],
	['collaboration', 'Sync'],
	['ui', 'UI & theming'],
	['shapes/tools', 'Shapes & tools'],
	['editor-api', 'Editor API'],
	['data/assets', 'Data & assets'],
	['use-cases', 'Use cases'],
]

export const examples = categories.map(([category, title]) => ({
	id: title,
	value: getExamplesForCategory(category as Category),
}))
