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

	nicelog('Typechecking files:', tsconfigFiles)

	const args = ['--build']
	const isWatchMode = process.argv.includes('--watch')
	if (process.argv.includes('--force')) args.push('--force')
	if (isWatchMode) args.push('--watch')
	if (process.argv.includes('--preserveWatchOutput')) args.push('--preserveWatchOutput')

	const tscPath = join(REPO_ROOT, 'node_modules/.bin/tsc')

	// In watch mode, use execFileSync with inherited stdio - it handles everything
	if (isWatchMode) {
		execFileSync(tscPath, [...args, ...tsconfigFiles], { stdio: 'inherit' })
		return
	}

	// In non-watch mode, capture output so we can show a clear error summary
	const output: string[] = []
	const errors: string[] = []

	return new Promise<void>((resolve) => {
		const childProcess = execFile(
			tscPath,
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

main().catch((err) => {
	console.error('Unexpected error:', err)
	process.exit(1)
})
