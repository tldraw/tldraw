import { compact, groupBy } from '@tldraw/utils'
import { join } from 'path'
import { REPO_ROOT, writeCodeFile } from './lib/file'
import { getAllWorkspacePackages } from './lib/workspace'

async function main() {
	const packages = await getAllWorkspacePackages()
	const templates = compact(packages.map((pkg) => pkg.packageJson.tldraw_template?.publish))
	const sortedTemplates = templates.sort((a, b) => {
		// sort by order, undefined values go last; then by name
		if (a.order === b.order) return a.name.localeCompare(b.name)
		if (a.order === undefined && b.order !== undefined) return 1
		if (a.order !== undefined && b.order === undefined) return -1
		return a.order! - b.order! // sort by order
	})

	const templatesByCategory = groupBy(sortedTemplates, (t) => t.category)

	const code = `
		export interface Template {
			repo: string
			name: string
			description: string
			category: 'framework' | 'app'
			order?: number
		}

		export interface Templates {
			framework: Template[]
			app: Template[]
		}

		export const TEMPLATES: Templates = ${JSON.stringify(templatesByCategory, null, 2)}
	`
	await writeCodeFile(
		'refresh-create-templates.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'create-tldraw', 'src', 'templates.ts'),
		code
	)
}

main()
