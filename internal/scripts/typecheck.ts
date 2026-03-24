import { execFile, execFileSync } from 'child_process'
import path, { join } from 'path'
import { REPO_ROOT, readJsonIfExists } from './lib/file'
import { nicelog } from './lib/nicelog'
import { getAllWorkspacePackages } from './lib/workspace'

async function main() {
	const allWorkspaces = await getAllWorkspacePackages()
	const tsconfigFiles: string[] = []
	for (const workspace of allWorkspaces) {
		const tsconfigFile = path.join(workspace.path, 'tsconfig.json')
		const tsconfigExists = await readJsonIfExists(tsconfigFile)
		if (tsconfigExists) tsconfigFiles.push(tsconfigFile)
	}

	const args = ['--build']
	const isWatchMode = process.argv.includes('--watch')
	if (process.argv.includes('--force')) args.push('--force')
	if (isWatchMode) args.push('--watch')
	if (process.argv.includes('--preserveWatchOutput')) args.push('--preserveWatchOutput')
	if (process.argv.includes('--extendedDiagnostics')) args.push('--extendedDiagnostics')

	const compilerPath = join(REPO_ROOT, 'node_modules/.bin/tsgo')
	nicelog(`Using tsgo for type checking`)

	// tsgo currently struggles to resolve some workspace package imports on a fresh checkout
	// when all projects are passed in a single --build invocation. Building package
	// workspaces first in topological order (leaves before dependents) produces the
	// declaration outputs needed for the full graph.
	const packageTsconfigFiles = tsconfigFiles.filter((file) =>
		file.includes(`${path.sep}packages${path.sep}`)
	)
	if (packageTsconfigFiles.length > 0) {
		const sortedPackageTsconfigFiles = await topoSortTsconfigs(packageTsconfigFiles)
		const bootstrapArgs = ['--build']
		if (process.argv.includes('--force')) bootstrapArgs.push('--force')
		for (const tsconfigFile of sortedPackageTsconfigFiles) {
			execFileSync(compilerPath, [...bootstrapArgs, tsconfigFile], { stdio: 'inherit' })
		}
	}

	// In watch mode, use execFileSync with inherited stdio - it handles everything
	if (isWatchMode) {
		execFileSync(compilerPath, [...args, ...tsconfigFiles], { stdio: 'inherit' })
		return
	}

	// In non-watch mode, capture output so we can show a clear error summary
	const output: string[] = []
	const errors: string[] = []

	return new Promise<void>((resolve) => {
		const childProcess = execFile(
			compilerPath,
			[...args, ...tsconfigFiles],
			{ cwd: REPO_ROOT },
			(err) => {
				if (err) {
					// Extract TypeScript errors from the output
					const allOutput = output.join('') + errors.join('')
					const tsErrors = allOutput.split('\n').filter((line) => {
						// Match TypeScript error lines like: "file.ts(123,4): error TS2304: ..."
						return /\.(ts|tsx|js|jsx)\(\d+,\d+\):\s+error\s+TS\d+:/i.test(line)
					})

					// Display a clear error summary at the end
					console.error('\n' + '='.repeat(80))
					console.error('❌ TypeScript type checking failed')
					console.error('='.repeat(80) + '\n')

					if (tsErrors.length > 0) {
						console.error('TypeScript errors:')
						tsErrors.forEach((error) => console.error(error))
						console.error('')
					} else if (errors.length > 0) {
						// Fallback: show stderr if we couldn't extract specific errors
						console.error('Error output:')
						console.error(errors.join(''))
						console.error('')
					}

					console.error('Please fix the errors above and try again.')
					console.error('='.repeat(80) + '\n')
					process.exit(err.code || 1)
				} else {
					resolve()
				}
			}
		)

		// Capture and display stdout in real-time
		childProcess.stdout?.on('data', (chunk) => {
			const text = chunk.toString()
			output.push(text)
			process.stdout.write(text)
		})

		// Capture and display stderr in real-time
		childProcess.stderr?.on('data', (chunk) => {
			const text = chunk.toString()
			errors.push(text)
			process.stderr.write(text)
		})
	})
}

/**
 * Sort tsconfig files in topological order based on their `references` fields,
 * so that leaf packages (no dependencies) come first and dependents come after
 * all their dependencies. This is needed because tsgo --build doesn't always
 * resolve the reference graph correctly on a fresh checkout.
 */
async function topoSortTsconfigs(tsconfigFiles: string[]): Promise<string[]> {
	const dirToFile = new Map<string, string>()
	const deps = new Map<string, string[]>()

	for (const file of tsconfigFiles) {
		const dir = path.dirname(file)
		dirToFile.set(dir, file)
		const tsconfig = await readJsonIfExists(file)
		const refs: string[] = []
		if (tsconfig?.references) {
			for (const ref of tsconfig.references) {
				refs.push(path.resolve(dir, ref.path))
			}
		}
		deps.set(dir, refs)
	}

	const visited = new Set<string>()
	const sorted: string[] = []

	function visit(dir: string) {
		if (visited.has(dir)) return
		visited.add(dir)
		for (const dep of deps.get(dir) ?? []) {
			if (dirToFile.has(dep)) visit(dep)
		}
		sorted.push(dirToFile.get(dir)!)
	}

	for (const dir of dirToFile.keys()) {
		visit(dir)
	}

	return sorted
}

main().catch((err) => {
	console.error('Unexpected error:', err)
	process.exit(1)
})
