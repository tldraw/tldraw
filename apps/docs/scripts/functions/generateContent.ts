import { GeneratedContent, InputSection } from '@/types/content-types'
import path from 'path'
import { generateSection } from './generateSection'

export async function generateContent() {
	const CONTENT_DIRECTORY = path.join(process.cwd(), 'content')
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const sections = require(path.join(CONTENT_DIRECTORY, 'sections.json')) as InputSection[]

	const result: GeneratedContent = {
		articles: {},
		sections: [],
	}

	for (let i = 0; i < sections.length; i++) {
		if (sections[i].id === 'reference') continue
		result.sections.push(generateSection(sections[i], result.articles, i))
	}

	return result
}
