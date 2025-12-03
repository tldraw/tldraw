import { exec } from 'child_process'
import { nicelog } from 'src/utils'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function publishToVSCodeMarketplace(preRelease: boolean) {
	nicelog(`Publishing to VS Code Marketplace${preRelease ? ' (pre-release)' : ''}`)
	await execAsync(`vsce publish${preRelease ? ' --pre-release' : ''}`)
	nicelog('Successfully published to VS Code Marketplace')
}

async function publishToOpenVSX() {
	nicelog('Publishing to Open VSX...')
	// OVSX_PAT is read from environment variable by ovsx CLI
	await execAsync('npx ovsx publish')
	nicelog('Successfully published to Open VSX')
}

async function main() {
	const preRelease = process.argv.includes('--pre-release')

	await publishToVSCodeMarketplace(preRelease)

	// Only publish to Open VSX for non-pre-release versions
	if (!preRelease) {
		await publishToOpenVSX()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
