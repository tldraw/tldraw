import * as path from 'path'
import { exec } from './lib/exec'
import { REPO_ROOT } from './lib/file'

async function main() {
	const shouldFix = process.argv.includes('--fix')
	const relativeCwd = path.relative(REPO_ROOT, process.cwd())

	try {
		await exec('yarn', ['prettier', shouldFix ? '--write' : '--check', '--cache', relativeCwd], {
			pwd: REPO_ROOT,
		})
		await exec(
			'yarn',
			[
				'eslint',
				'--report-unused-disable-directives',
				'--no-error-on-unmatched-pattern',
				shouldFix ? '--fix' : null,
				relativeCwd,
			],
			{ pwd: REPO_ROOT }
		)
	} catch (error) {
		process.exit(1)
	}
}

main()
