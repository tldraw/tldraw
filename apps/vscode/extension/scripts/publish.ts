import { exec } from 'child_process'

async function main() {
	const preRelease = process.argv.includes('--pre-release')
	// eslint-disable-next-line no-console
	console.log(`Publishing extension${preRelease ? ' (pre-release)' : ''}`)
	exec(`vsce publish${preRelease ? ' --pre-release' : ''}`)
}

main()
