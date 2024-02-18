import glob from 'glob'
import isCI from 'is-ci'
import path from 'path'
import { rimraf } from 'rimraf'
import { exec } from './lib/exec'
import { sortUnions } from './lib/sort-unions'

async function buildApi(sourcePackageDir: string) {
	// this depends on `build-types` being run first, but we'll rely on turbo to
	// make that happen.

	const relativeSourcePackageDir = path.relative(path.resolve(__dirname, '../..'), sourcePackageDir)

	// we need to copy the .tsbuild dir to another location so we can edit it without busting the cache
	await rimraf(path.join(sourcePackageDir, '.tsbuild-api'))
	await exec('cp', ['-R', './.tsbuild', './.tsbuild-api'], { pwd: sourcePackageDir })

	sortUnions(path.join(sourcePackageDir, '.tsbuild-api'))

	// clear api-extractor build files
	rimraf.sync(glob.sync(path.join(sourcePackageDir, 'api')))
	// extract public api
	try {
		await exec('yarn', ['run', '-T', 'api-extractor', 'run', isCI ? null : '--local'], {
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
		console.error(e)

		// get git diff
		console.error('api-report diff')
		await exec('git', [
			'diff',
			'--no-color',
			'--no-ext-diff',
			'--no-index',
			'api-report.md',
			'api/temp/api-report.md',
		])

		process.exit(1)
	}
}

buildApi(process.cwd())
