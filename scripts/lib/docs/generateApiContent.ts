import { ApiModel } from '@microsoft/api-extractor-model'
import fs from 'fs'
import path from 'path'
import { Articles, GeneratedContent, InputSection, MarkdownContent } from './docs-types'
import { getSlug } from './docs-utils'
import { generateSection } from './generateSection'
import { getApiMarkdown } from './getApiMarkdown'

const { log: nicelog } = console

async function generateApiDocs() {
	const apiInputSection: InputSection = {
		id: 'gen' as string,
		title: 'API',
		description: "Reference for the tldraw package's APIs (generated).",
		categories: [],
	}

	const addedCategories = new Set<string>()

	const OUTPUT_DIR = path.join(process.cwd(), '..', '..', 'bublic', 'docs', 'gen')
	const INPUT_DIR = path.join(process.cwd(), '..', '..', 'bublic', 'packages')

	if (fs.existsSync(OUTPUT_DIR)) {
		fs.rmdirSync(OUTPUT_DIR, { recursive: true })
	}

	fs.mkdirSync(OUTPUT_DIR)

	// to include more packages in docs, add them to devDependencies in package.json
	const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
	const tldrawPackagesToIncludeInDocs = Object.keys(packageJson.devDependencies).filter((dep) =>
		dep.startsWith('@tldraw/')
	)
	const model = new ApiModel()
	const packageModels = []

	for (const packageName of tldrawPackagesToIncludeInDocs) {
		// Get the file contents
		const filePath = path.join(INPUT_DIR, packageName.replace('@tldraw/', ''), 'api', 'api.json')

		packageModels.push(model.loadPackage(filePath))
	}

	for (const packageModel of packageModels) {
		try {
			const categoryName = packageModel.name.replace(`@tldraw/`, '')

			if (!addedCategories.has(categoryName)) {
				apiInputSection.categories!.push({
					id: categoryName,
					title: packageModel.name,
					description: '',
					groups: [
						{
							id: 'Namespace',
							title: 'Namespaces',
						},
						{
							id: 'Class',
							title: 'Classes',
						},
						{
							id: 'Function',
							title: 'Functions',
						},
						{
							id: 'Variable',
							title: 'Variables',
						},
						{
							id: 'Enum',
							title: 'Enums',
						},
						{
							id: 'Interface',
							title: 'Interfaces',
						},
						{
							id: 'TypeAlias',
							title: 'TypeAliases',
						},
					],
				})
				addedCategories.add(categoryName)
			}

			const entrypoint = packageModel.entryPoints[0]

			for (let j = 0; j < entrypoint.members.length; j++) {
				const item = entrypoint.members[j]
				const result = await getApiMarkdown(categoryName, item, j)
				const outputFileName = `${getSlug(item)}.mdx`
				fs.writeFileSync(path.join(OUTPUT_DIR, outputFileName), result.markdown)
			}
		} catch (e: any) {
			throw Error(`Could not create API docs for ${packageModel.name}: ${e.message}`)
		}
	}

	return apiInputSection
}

export async function generateApiContent(): Promise<GeneratedContent> {
	const content: MarkdownContent = {}
	const articles: Articles = {}

	try {
		nicelog('• Generating api docs site content (content.json)')

		const inputApiSection = await generateApiDocs()
		const outputApiSection = generateSection(inputApiSection, content, articles)
		const contentComplete = { sections: [outputApiSection], content, articles }

		fs.writeFileSync(
			path.join(process.cwd(), 'api-content.json'),
			JSON.stringify(contentComplete, null, 2)
		)

		nicelog('✔ Generated api content.')

		return contentComplete
	} catch (error: any) {
		nicelog(`x Could not generate site content: ${error.message}`)

		throw error
	}
}
