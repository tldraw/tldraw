import { Articles, GeneratedContent, InputSection } from '../../types/content-types'
import { generateSection } from './generateSection'

const { log: nicelog } = console

// Keep in sync with `categories` in apps/examples/src/examples.tsx. An example whose folder
// isn't listed here has no category row, so it disappears from the sidebar and llms.txt;
// generateSection throws for that case.
export const EXAMPLES_CATEGORIES = [
	{ id: 'getting-started', title: 'Getting started', description: '', groups: [], hero: null },
	{ id: 'configuration', title: 'Configuration', description: '', groups: [], hero: null },
	{ id: 'editor-api', title: 'Editor API', description: '', groups: [], hero: null },
	{ id: 'ui', title: 'UI & theming', description: '', groups: [], hero: null },
	{ id: 'layout', title: 'Page layout', description: '', groups: [], hero: null },
	{ id: 'events', title: 'Events & effects', description: '', groups: [], hero: null },
	{ id: 'shapes/tools', title: 'Shapes & tools', description: '', groups: [], hero: null },
	{ id: 'users', title: 'Users', description: '', groups: [], hero: null },
	{ id: 'collaboration', title: 'Collaboration', description: '', groups: [], hero: null },
	{ id: 'data/assets', title: 'Data & assets', description: '', groups: [], hero: null },
	{ id: 'use-cases', title: 'Use cases', description: '', groups: [], hero: null },
]

const section: InputSection = {
	id: 'examples',
	title: 'Examples',
	description: 'Code recipes for bending tldraw to your will.',
	categories: EXAMPLES_CATEGORIES,
	hero: null,
	sidebar_behavior: 'show-links',
}

// Sections from sections.json are numbered 0..n in order; the prev/next footer links walk to
// the section at idx ± 1. Examples have their own sidebar and must not neighbour any of them
// (reference uses 999999 for the same reason), so give them an index far away from both.
const EXAMPLES_SECTION_INDEX = 888888

export async function generateExamplesContent(): Promise<GeneratedContent> {
	const articles: Articles = {}

	try {
		const outputExamplesSection = generateSection(section, articles, EXAMPLES_SECTION_INDEX)
		const contentComplete = { sections: [outputExamplesSection], articles }

		return contentComplete
	} catch (error) {
		nicelog(`x Could not generate Examples content`)

		throw error
	}
}
