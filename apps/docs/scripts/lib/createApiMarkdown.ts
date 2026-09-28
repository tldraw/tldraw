import fs from 'fs'
import path from 'path'
import { ApiItem, ApiItemKind } from '@microsoft/api-extractor-model'
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

			// Users look up `typeof X` pairs as values, so the value decides the sidebar group and tags
			const frontmatterItem = items.find(isValueItem) ?? items[0]
			const headings = getDeclarationHeadings(items)

			let frontmatter = ''
			const bodies: string[] = []
			for (let i = 0; i < items.length; i++) {
				const item = items[i]
				const result = await getApiMarkdown(model, categoryName, item, order)
				if (item === frontmatterItem) frontmatter = result.frontmatter
				// Reference pages hide `hr`, so merged declarations need their own headings or they
				// read as part of the previous declaration's last section
				bodies.push(
					items.length === 1
						? result.markdown
						: `## ${headings[i]}\n\n${demoteHeadings(result.markdown)}`
				)
			}
			order++

			nicelog(`✎ ${outputFileName}`)
			fs.writeFileSync(path.join(OUTPUT_DIR, outputFileName), frontmatter + bodies.join('\n'))
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

function isValueItem(item: ApiItem) {
	return item.kind === ApiItemKind.Variable || item.kind === ApiItemKind.Function
}

const DECLARATION_LABELS: Partial<Record<ApiItemKind, string>> = {
	[ApiItemKind.Class]: 'Class',
	[ApiItemKind.Enum]: 'Enum',
	[ApiItemKind.Function]: 'Function',
	[ApiItemKind.Interface]: 'Interface',
	[ApiItemKind.Namespace]: 'Namespace',
	[ApiItemKind.TypeAlias]: 'Type',
	[ApiItemKind.Variable]: 'Value',
}

function getDeclarationHeadings(items: ApiItem[]) {
	const labels = items.map((item) => DECLARATION_LABELS[item.kind] ?? item.kind)
	if (items.every((item) => item.kind === ApiItemKind.Function)) {
		return items.map((_, i) => `Overload ${i + 1}`)
	}
	return labels.map((label, i) =>
		labels.indexOf(label) === labels.lastIndexOf(label)
			? label
			: `${label} ${labels.slice(0, i + 1).filter((l) => l === label).length}`
	)
}

/** Push a declaration's headings one level down so they nest under its declaration heading. */
function demoteHeadings(markdown: string) {
	let inCodeBlock = false
	return markdown
		.split('\n')
		.map((line) => {
			if (line.startsWith('```')) inCodeBlock = !inCodeBlock
			return !inCodeBlock && /^#{1,5} /.test(line) ? `#${line}` : line
		})
		.join('\n')
}
