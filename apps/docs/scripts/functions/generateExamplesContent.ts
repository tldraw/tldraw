import { Articles, GeneratedContent, InputSection } from '../../types/content-types'
import { generateSection } from './generateSection'

const { log: nicelog } = console

const section: InputSection = {
	id: 'examples',
	title: 'Examples',
	description: 'Code recipes for bending tldraw to your will.',
	categories: [
		{ id: 'basic', title: 'Getting Started', description: '', groups: [] },
		{ id: 'ui', title: 'UI/Theming', description: '', groups: [] },
		{ id: 'shapes/tools', title: 'Shapes & Tools', description: '', groups: [] },
		{ id: 'data/assets', title: 'Data & Assets', description: '', groups: [] },
		{ id: 'editor-api', title: 'Editor API', description: '', groups: [] },
		{ id: 'collaboration', title: 'Collaboration', description: '', groups: [] },
	],
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
