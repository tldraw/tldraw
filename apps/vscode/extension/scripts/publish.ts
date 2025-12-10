import { exec } from 'child_process'
import { readdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
	await execAsync(`vsce publish${preRelease ? ' --pre-release' : ''}`)
	// eslint-disable-next-line no-console
	console.log('Successfully published to VS Code Marketplace')
}

async function publishToOpenVSX(preRelease: boolean) {
	const vsixPath = getVsixPath()
	// eslint-disable-next-line no-console
	console.log('Publishing to Open VSX...')
	// OVSX_PAT is read from environment variable by ovsx CLI
	await execAsync(`npx ovsx publish${preRelease ? ' --pre-release' : ''} ${vsixPath}`)
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
