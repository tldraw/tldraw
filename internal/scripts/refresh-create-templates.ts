import { compact } from '@tldraw/utils'
import { join } from 'path'
import { REPO_ROOT, writeCodeFile } from './lib/file'
import { getAllWorkspacePackages } from './lib/workspace'

async function main() {
	const packages = await getAllWorkspacePackages()
	const templates = compact(
		packages.map((pkg) => {
			if (!pkg.packageJson.tldraw_template?.cli) return null
			return {
				...pkg.packageJson.tldraw_template.cli,
				repo: pkg.packageJson.tldraw_template.repo,
			}
		})
	)
	const sortedTemplates = templates.sort((a, b) => {
		// sort by order, undefined values go last; then by name
		if (a.order === b.order) return a.name.localeCompare(b.name)
		if (a.order === undefined && b.order !== undefined) return 1
		if (a.order !== undefined && b.order === undefined) return -1
		return a.order! - b.order! // sort by order
	})

	const code = `
		export interface Template {
			repo: string
			name: string
			description: string
			shortDescription?: string
			order?: number
		}

		export const TEMPLATES: Template[] = ${JSON.stringify(sortedTemplates, null, 2)}
	`
	await writeCodeFile(
		'refresh-create-templates.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'create-tldraw', 'src', 'templates.ts'),
		code
	)
}

main()
