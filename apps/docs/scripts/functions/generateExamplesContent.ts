import path from 'path'
import { Articles, GeneratedContent, InputSection } from '../../types/content-types'
import { generateSection } from './generateSection'

const { log: nicelog } = console

export async function generateApiContent(): Promise<GeneratedContent> {
	const articles: Articles = {}
	const CONTENT_DIRECTORY = path.join(process.cwd(), 'content')
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const sections = require(path.join(CONTENT_DIRECTORY, 'sections.json')) as InputSection[]

	try {
		const inputApiSection = sections.find((s) => s.id === 'reference')
		if (!inputApiSection) throw new Error(`Could not find section with id 'reference'`)
		const outputApiSection = generateSection(inputApiSection, articles, 999999) // always at the end!
		const contentComplete = { sections: [outputApiSection], articles }

		return contentComplete
	} catch (error) {
		nicelog(`x Could not generate API content`)

		throw error
	}
}
