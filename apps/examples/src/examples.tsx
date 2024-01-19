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

const basicExamples = (
	Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[]
)
	.filter((e) => e.category === 'basic')
	.sort((a, b) => {
		if (a.order === null) {
			return 1
		} else if (b.order === null) {
			return -1
		} else {
			return a.order - b.order
		}
	})

const uiExamples = (
	Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[]
)
	.filter((e) => e.category === 'ui')
	.sort((a, b) => {
		if (a.order === null) {
			return 1
		} else if (b.order === null) {
			return -1
		} else {
			return a.order - b.order
		}
	})
const shapeExamples = (
	Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[]
)
	.filter((e) => e.category === 'shapes/tools')
	.sort((a, b) => {
		if (a.order === null) {
			return 1
		} else if (b.order === null) {
			return -1
		} else {
			return a.order - b.order
		}
	})

const editorExamples = (
	Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[]
)
	.filter((e) => e.category === 'editor')
	.sort((a, b) => {
		if (a.order === null) {
			return 1
		} else if (b.order === null) {
			return -1
		} else {
			return a.order - b.order
		}
	})
const dataExamples = (
	Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[]
)
	.filter((e) => e.category === 'data/assets')
	.sort((a, b) => {
		if (a.order === null) {
			return 1
		} else if (b.order === null) {
			return -1
		} else {
			return a.order - b.order
		}
	})

const collaborationExamples = (
	Object.values(import.meta.glob('./examples/*/README.md', { eager: true })) as Example[]
)
	.filter((e) => e.category === 'collaboration')
	.sort((a, b) => {
		if (a.order === null) {
			return 1
		} else if (b.order === null) {
			return -1
		} else {
			return a.order - b.order
		}
	})

export const examples = [
	{ id: 'basic', array: basicExamples },
	{ id: 'ui', array: uiExamples },
	{ id: 'shapes/tools', array: shapeExamples },
	{ id: 'editor', array: editorExamples },
	{ id: 'data', array: dataExamples },
	{ id: 'collaboration', array: collaborationExamples },
]
