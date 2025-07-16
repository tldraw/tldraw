import { compact } from '@tldraw/utils'
import { getAllWorkspacePackages } from './lib/workspace'

async function main() {
	const packages = await getAllWorkspacePackages()
	const templates = compact(packages.map((pkg) => pkg.packageJson.tldraw_template?.publish))

	console.log(templates)
}

main()
