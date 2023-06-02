import { execFileSync } from 'child_process'
import path, { join } from 'path'
import { REPO_ROOT, readJsonIfExists } from './lib/file'
import { nicelog } from './lib/nicelog'
import { getAllWorkspacePackages } from './lib/workspace'

async function main() {
	const allWorkspaces = await getAllWorkspacePackages()
	const tsconfigFiles = []
	for (const workspace of allWorkspaces) {
		const tsconfigFile = path.join(workspace.path, 'tsconfig.json')
		const tsconfigExists = await readJsonIfExists(tsconfigFile)
		if (tsconfigExists) tsconfigFiles.push(tsconfigFile)
	}

	nicelog('Typechecking files:', tsconfigFiles)

	const args = ['--build']
	if (process.argv.includes('--force')) args.push('--force')
	if (process.argv.includes('--watch')) args.push('--watch')
	if (process.argv.includes('--preserveWatchOutput')) args.push('--preserveWatchOutput')
	execFileSync(join(REPO_ROOT, 'node_modules/.bin/tsc'), [...args, ...tsconfigFiles], {
		stdio: 'inherit',
	})
}

main()
