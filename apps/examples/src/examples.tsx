import { ComponentType } from 'react'

export type Example = {
	title: string
	description: string
	details: string
	path: string
	codeUrl: string
	hide: boolean
	order: number | null
	componentFile: string
	loadComponent: () => Promise<ComponentType>
}

export const examples = (
	Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[]
).sort((a, b) => {
	// sort by order then title:
	if (a.order === b.order) {
		return a.title.localeCompare(b.title)
	} else if (a.order === null) {
		return 1
	} else if (b.order === null) {
		return -1
	} else {
		return a.order - b.order
	}
})
