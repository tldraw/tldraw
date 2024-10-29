import { Articles, GeneratedContent, InputSection } from '../../types/content-types'
import { generateSection } from './generateSection'

const { log: nicelog } = console

const section: InputSection = {
	id: 'examples',
	title: 'Examples',
	description: 'Code recipes for bending tldraw to your will.',
	categories: [
		{ id: 'basic', title: 'Getting started', description: '', groups: [], hero: null },
		{ id: 'ui', title: 'UI & theming', description: '', groups: [], hero: null },
		{ id: 'shapes/tools', title: 'Shapes & tools', description: '', groups: [], hero: null },
		{ id: 'data/assets', title: 'Data & assets', description: '', groups: [], hero: null },
		{ id: 'editor-api', title: 'Editor API', description: '', groups: [], hero: null },
		{ id: 'collaboration', title: 'Collaboration', description: '', groups: [], hero: null },
		{ id: 'use-cases', title: 'Use cases', description: '', groups: [], hero: null },
	],
	hero: null,
	sidebar_behavior: 'show-links',
}

export async function generateExamplesContent(): Promise<GeneratedContent> {
	const articles: Articles = {}

	try {
		const outputExamplesSection = generateSection(section, articles, 0)
		const contentComplete = { sections: [outputExamplesSection], articles }

		return contentComplete
	} catch (error) {
		nicelog(`x Could not generate Examples content`)

		throw error
	}
}
