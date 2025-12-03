import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function publishToVSCodeMarketplace(preRelease: boolean) {
	// eslint-disable-next-line no-console
	console.log(`Publishing to VS Code Marketplace${preRelease ? ' (pre-release)' : ''}`)
	await execAsync(`vsce publish${preRelease ? ' --pre-release' : ''}`)
	// eslint-disable-next-line no-console
	console.log('Successfully published to VS Code Marketplace')
}

async function publishToOpenVSX() {
	// eslint-disable-next-line no-console
	console.log('Publishing to Open VSX...')
	// OVSX_PAT is read from environment variable by ovsx CLI
	await execAsync('npx ovsx publish')
	// eslint-disable-next-line no-console
	console.log('Successfully published to Open VSX')
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
