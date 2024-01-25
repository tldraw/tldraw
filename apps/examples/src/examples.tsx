import { ComponentType } from 'react'

export type Example = {
	title: string
	description: string
	details: string
	path: string
	codeUrl: string
	hide: boolean
	category: 'basic' | 'editor' | 'ui' | 'collaboration' | 'data/assets' | 'shapes/tools' | null
	order: number | null
	componentFile: string
	loadComponent: () => Promise<ComponentType>
}

type Category = 'basic' | 'editor' | 'ui' | 'collaboration' | 'data/assets' | 'shapes/tools'

const getExamplesForCategory = (category: Category) =>
	(Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[])
		.filter((e) => e.category === category)
		.sort((a, b) => {
			if (a.order === null) {
				return 1
			} else if (b.order === null) {
				return -1
			} else {
				return a.order - b.order
			}
		})

const categories: Record<Category, string> = {
	basic: 'Getting Started',
	ui: 'UI/Theming',
	'shapes/tools': 'Shapes & Tools',
	'data/assets': 'Data & Assets',
	editor: 'Editor API',
	collaboration: 'Collaboration',
}

export const examples = Object.entries(categories).map(([category, title]) => ({
	id: title,
	value: getExamplesForCategory(category as Category),
}))
