import fs from 'fs'
import path from 'path'
import { ApiItem } from '@microsoft/api-extractor-model'
import { APIGroup, InputSection } from '@/types/content-types'
import { nicelog } from '@/utils/nicelog'
import { TldrawApiModel } from '@/utils/TldrawApiModel'
import { getApiMarkdown } from './getApiMarkdown'
import { CONTENT_DIR, getSlug } from './utils'

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

	const model = new TldrawApiModel()
	let packageModels = []

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

	// Manually keep 'tldraw' package in same place as it was before the alphabetical sort
	// for continuity and to prevent scroll issues when initially opening the API reference
	packageModels = packageModels.sort((a, b) => {
		const aName = a.name === 'tldraw' ? '@tldraw/tldraw' : a.name
		const bName = b.name === 'tldraw' ? '@tldraw/tldraw' : b.name
		return aName.localeCompare(bName)
	})

	await model.preprocessReactComponents()

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

		// Overloads and same-named declarations (an interface and a const both called
		// `Geometry2dFilters`, the four `computed` overloads) share a slug and therefore a page.
		// Writing each item to `${slug}.mdx` in turn would leave only the last one documented.
		const membersBySlug = new Map<string, ApiItem[]>()
		for (const item of entrypoint.members) {
			const slug = getSlug(item)
			membersBySlug.set(slug, [...(membersBySlug.get(slug) ?? []), item])
		}

		let order = 0
		for (const [slug, items] of membersBySlug) {
			const outputFileName = `${slug}.mdx`

			let frontmatter = ''
			const bodies: string[] = []
			for (const item of items) {
				const result = await getApiMarkdown(model, categoryName, item, order)
				frontmatter ||= result.frontmatter
				bodies.push(result.markdown)
			}
			order++

			nicelog(`✎ ${outputFileName}`)
			fs.writeFileSync(
				path.join(OUTPUT_DIR, outputFileName),
				frontmatter + bodies.join('\n---\n\n')
			)
		}
	}

	// Add the API section to the sections.json file

	const sectionsJsonPath = path.join(CONTENT_DIR, 'sections.json')
	const sectionsJson = JSON.parse(fs.readFileSync(sectionsJsonPath, 'utf8')) as InputSection[]
	// findIndex returns -1 when there's no reference section yet, and splice(-1, 1) would drop
	// the last real section instead
	const existingIndex = sectionsJson.findIndex((s) => s.id === 'reference')
	if (existingIndex !== -1) sectionsJson.splice(existingIndex, 1)
	sectionsJson.push(apiInputSection)
	fs.writeFileSync(sectionsJsonPath, JSON.stringify(sectionsJson, null, '\t') + '\n')

	model.throwEncounteredErrors()
}
