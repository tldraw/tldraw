import { ComponentType } from 'react'

export type Example = {
	title: string
	description: string
	details: string
	path: string
	codeUrl: string
	hide: boolean
	category: Category
	priority: number
	componentFile: string
	loadComponent: () => Promise<ComponentType>
}

type Category = 'basic' | 'editor-api' | 'ui' | 'collaboration' | 'data/assets' | 'shapes/tools'

const getExamplesForCategory = (category: Category) =>
	(Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[])
		.filter((e) => e.category === category)
		.sort((a, b) => {
			if (a.priority === b.priority) return a.title.localeCompare(b.title)
			return a.priority - b.priority
		})

const categories: Record<Category, string> = {
	basic: 'Getting Started',
	ui: 'UI/Theming',
	'shapes/tools': 'Shapes & Tools',
	'data/assets': 'Data & Assets',
	'editor-api': 'Editor API',
	collaboration: 'Collaboration',
}

export const examples = Object.entries(categories).map(([category, title]) => ({
	id: title,
	value: getExamplesForCategory(category as Category),
}))
