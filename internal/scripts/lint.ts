import * as path from 'path'
import { exec } from './lib/exec'
import { REPO_ROOT } from './lib/file'

async function main() {
	const shouldFix = process.argv.includes('--fix')
	const relativeCwd = path.relative(REPO_ROOT, process.cwd())

	try {
		if (shouldFix) {
			const filePattern = `${relativeCwd}/**/*.{js,jsx,ts,tsx,cjs,mjs}`
			await exec('yarn', ['oxfmt', '--write', '--no-error-on-unmatched-pattern', filePattern], {
				pwd: REPO_ROOT,
			})
		}
		await exec('yarn', ['oxlint', ...(shouldFix ? ['--fix'] : []), relativeCwd], { pwd: REPO_ROOT })
	} catch {
		process.exit(1)
	}
}

main()
