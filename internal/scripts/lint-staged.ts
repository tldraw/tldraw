#!/usr/bin/env tsx
import { execFile } from 'child_process'
import { REPO_ROOT } from './lib/file'

async function main() {
	const output: string[] = []
	const errors: string[] = []

	return new Promise<void>((resolve) => {
		const childProcess = execFile('yarn', ['lint-staged'], { cwd: REPO_ROOT }, (err) => {
			if (err) {
				// Display a clear error summary at the end
				console.error('\n' + '='.repeat(80))
				console.error('❌ lint-staged failed')
				console.error('='.repeat(80) + '\n')

				// Show error output
				if (errors.length > 0) {
					console.error('Error output:')
					console.error(errors.join(''))
					console.error('')
				}

				// Show any captured output that might contain useful info
				const outputStr = output.join('')
				if (outputStr) {
					// Filter for lines that look like errors
					const errorLines = outputStr.split('\n').filter((line) => {
						const lower = line.toLowerCase()
						return (
							lower.includes('error') ||
							lower.includes('failed') ||
							lower.includes('✖') ||
							lower.includes('❌')
						)
					})

					if (errorLines.length > 0) {
						console.error('Relevant error messages:')
						errorLines.forEach((line) => console.error(line))
						console.error('')
					}
				}

				console.error('Please fix the errors above and try again.')
				console.error('='.repeat(80) + '\n')
				process.exit(1)
			} else {
				resolve()
			}
		})

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
