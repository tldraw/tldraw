import { exec } from 'child_process'
import { readdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)
const MAX_REGISTRY_PUBLISH_ATTEMPTS = 3
const REGISTRY_PUBLISH_RETRY_DELAY_MS = 10_000

async function publishWithRetry(command: string) {
	for (let attempt = 1; attempt <= MAX_REGISTRY_PUBLISH_ATTEMPTS; attempt++) {
		try {
			await execAsync(command)
			return
		} catch (err) {
			const error = err as Error & { stdout?: string; stderr?: string }
			// Marketplace version conflicts need a new package version from the calling script.
			if (
				attempt === MAX_REGISTRY_PUBLISH_ATTEMPTS ||
				[error.message, error.stdout, error.stderr].some((text) => text?.includes('already exists'))
			) {
				throw err
			}
			console.error(
				`Publish attempt ${attempt}/${MAX_REGISTRY_PUBLISH_ATTEMPTS} failed; retrying in ${REGISTRY_PUBLISH_RETRY_DELAY_MS / 1000}s...`,
				err
			)
			await new Promise((resolve) => setTimeout(resolve, REGISTRY_PUBLISH_RETRY_DELAY_MS))
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
	// An upload can succeed even if its response is lost; retrying must accept that version.
	await publishWithRetry(
		`npx ovsx publish --skip-duplicate${preRelease ? ' --pre-release' : ''} ${vsixPath}`
	)
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
