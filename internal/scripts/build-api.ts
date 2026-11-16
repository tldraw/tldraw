import { rmSync } from 'fs'
import { rm } from 'fs/promises'
import path from 'path'
import { glob } from 'glob'
import isCI from 'is-ci'
import { exec } from './lib/exec'
import { sortUnions } from './lib/sort-unions'

async function buildApi(sourcePackageDir: string) {
	// turbo runs `build-types` before this.

	const relativeSourcePackageDir = path.relative(path.resolve(__dirname, '../..'), sourcePackageDir)

	// we need to copy the .tsbuild dir to another location so we can edit it without busting the cache
	await rm(path.join(sourcePackageDir, '.tsbuild-api'), { recursive: true, force: true })
	await exec('cp', ['-R', './.tsbuild', './.tsbuild-api'], { pwd: sourcePackageDir })

	sortUnions(path.join(sourcePackageDir, '.tsbuild-api'))

	// clear api-extractor build files
	for (const p of glob.sync(path.join(sourcePackageDir, 'api'))) {
		rmSync(p, { recursive: true, force: true })
	}
	// extract public api
	try {
		await exec('pnpm', ['exec', 'api-extractor', 'run', isCI ? null : '--local'], {
			pwd: sourcePackageDir,
			processStderrLine: (line) => {
				process.stderr.write(`${line}\n`)

				if (process.env.PRINT_GITHUB_ANNOTATIONS) {
					const errorMatch = line.match(
						// eslint-disable-next-line no-control-regex
						/^(?:\u001b\[33m)?(Warning|Error): (.+?):(\d+):(\d+) - \((.*)\) (.*)(?:\u001b\[39m)?$/
					)
					if (errorMatch) {
						const [, errorType, file, line, column, messageTitle, message] = errorMatch

						process.stdout.write(
							`::${errorType.toLowerCase()} file=${relativeSourcePackageDir}/${file},line=${line},col=${column},title=${messageTitle}::${message}}\n`
						)
					}
				}
			},
		})
	} catch (e) {
		// get git diff
		await exec('git', [
			'diff',
			'--no-color',
			'--no-ext-diff',
			'--no-index',
			'api-report.api.md',
			'api/temp/api-report.api.md',
		])

		// @ts-expect-error
		console.error(e.message)

		process.exit(1)
	}
}

buildApi(process.cwd())
