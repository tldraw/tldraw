import { exec } from 'child_process'
import { readdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function publishWithRetry(command: string) {
	const maxAttempts = 3
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			await execAsync(command)
			return
		} catch (err) {
			const error = err as Error & { stdout?: string; stderr?: string }
			// Version conflicts need a new package version from the calling script.
			if (
				attempt === maxAttempts ||
				[error.message, error.stdout, error.stderr].some((text) => text?.includes('already exists'))
			) {
				throw err
			}
			console.error(`Publish attempt ${attempt}/${maxAttempts} failed; retrying in 10s...`, err)
			await new Promise((resolve) => setTimeout(resolve, 10_000))
		}
	}
}

function getVsixPath(): string {
	const tempDir = join(__dirname, '../temp')
	const files = readdirSync(tempDir)
	const vsixFile = files.find((file) => file.endsWith('.vsix'))
	if (!vsixFile) {
		throw new Error('No .vsix file found in temp directory')
	}
	return join(tempDir, vsixFile)
}

async function publishToVSCodeMarketplace(preRelease: boolean) {
	// eslint-disable-next-line no-console
	console.log(`Publishing to VS Code Marketplace${preRelease ? ' (pre-release)' : ''}`)
	await publishWithRetry(`vsce publish${preRelease ? ' --pre-release' : ''}`)
	// eslint-disable-next-line no-console
	console.log('Successfully published to VS Code Marketplace')
}

async function publishToOpenVSX(preRelease: boolean) {
	const vsixPath = getVsixPath()
	// eslint-disable-next-line no-console
	console.log('Publishing to Open VSX...')
	// OVSX_PAT is read from environment variable by ovsx CLI
	await publishWithRetry(`npx ovsx publish${preRelease ? ' --pre-release' : ''} ${vsixPath}`)
	// eslint-disable-next-line no-console
	console.log('Successfully published to Open VSX')
}

async function main() {
	const preRelease = process.argv.includes('--pre-release')

	await publishToVSCodeMarketplace(preRelease)
	await publishToOpenVSX(preRelease)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
