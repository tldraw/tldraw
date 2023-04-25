import { join, relative } from 'path'

import { exec } from './lib/exec'
import { REPO_ROOT } from './lib/file'

async function main() {
	const shouldFix = process.argv.includes('--fix')

	try {
		await exec(
			'yarn',
			[
				'run',
				'-T',
				'prettier',
				shouldFix ? '--write' : '--check',
				// we have to run prettier from root so it picks up the ignore file
				join(relative(REPO_ROOT, process.cwd()), '**', '*.{ts,tsx}'),
			],
			{ pwd: REPO_ROOT }
		)
		await exec('yarn', [
			'run',
			'-T',
			'eslint',
			'--report-unused-disable-directives',
			'--ignore-path',
			join(REPO_ROOT, '.eslintignore'),
			shouldFix ? '--fix' : null,
			'.',
		])
	} catch (error) {
		process.exit(1)
	}
}

main()
