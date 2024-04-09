import { APIGroup, InputSection } from '@/types/content-types'
import { nicelog } from '@/utils/nicelog'
import { ApiModel } from '@microsoft/api-extractor-model'
import fs from 'fs'
import path from 'path'
import { CONTENT_DIR, getSlug } from '../utils'
import { getApiMarkdown } from './getApiMarkdown'

export async function createApiMarkdown() {
	const apiInputSection: InputSection = {
		id: 'reference' as string,
		title: 'API Reference',
		description: "Reference for the tldraw package's APIs (generated).",
		categories: [],
		sidebar_behavior: 'reference',
		hero: null,
	}

	const addedCategories = new Set<string>()

	const INPUT_DIR = path.join(process.cwd(), 'api')
	const OUTPUT_DIR = path.join(CONTENT_DIR, 'reference')

	if (fs.existsSync(OUTPUT_DIR)) {
		fs.rmSync(OUTPUT_DIR, { recursive: true })
	}

	fs.mkdirSync(OUTPUT_DIR)

	const model = new ApiModel()
	const packageModels = []

	// get all files in the INPUT_DIR
	const files = fs.readdirSync(INPUT_DIR)
	for (const file of files) {
		// get the file path
		const filePath = path.join(INPUT_DIR, file)

		// parse the file
		const apiModel = model.loadPackage(filePath)

		// add the parsed file to the packageModels array
		packageModels.push(apiModel)
	}

	for (const packageModel of packageModels) {
		const categoryName = packageModel.name.replace(`@tldraw/`, '')

		if (!addedCategories.has(categoryName)) {
			apiInputSection.categories!.push({
				id: categoryName,
				title: packageModel.name,
				description: '',
				groups: Object.values(APIGroup).map((title) => ({
					id: title,
					path: null,
				})),
				hero: null,
			})
			addedCategories.add(categoryName)
		}

		const entrypoint = packageModel.entryPoints[0]

		for (let j = 0; j < entrypoint.members.length; j++) {
			const item = entrypoint.members[j]

			const result = await getApiMarkdown(categoryName, item, j)
			const outputFileName = `${getSlug(item)}.mdx`
			nicelog(`✎ ${outputFileName}`)
			fs.writeFileSync(path.join(OUTPUT_DIR, outputFileName), result.markdown)
		}
	}

	// Add the API section to the sections.json file

	const sectionsJsonPath = path.join(CONTENT_DIR, 'sections.json')
	const sectionsJson = JSON.parse(fs.readFileSync(sectionsJsonPath, 'utf8')) as InputSection[]
	sectionsJson.splice(
		sectionsJson.findIndex((s) => s.id === 'reference'),
		1
	)
	sectionsJson.push(apiInputSection)
	fs.writeFileSync(sectionsJsonPath, JSON.stringify(sectionsJson, null, '\t') + '\n')
}
