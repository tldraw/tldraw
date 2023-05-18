import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import * as commands from './commands'

yargs(hideBin(process.argv))
	.usage('Usage: $0 <command> [options]')
	.scriptName('yarn e2e')
	.command(
		'serve',
		'start test server',
		(yargs) => {
			return yargs
		},
		async () => {
			const exitCode = await commands.serve()
			process.exit(exitCode)
		}
	)
	.command(
		'test:ci [env]',
		'runner for CI (github-actions)',
		(yargs) => {
			return yargs.positional('env', {
				type: 'string',
				default: 'local',
				choices: ['local', 'nightly'],
			})
		},
		async (argv) => {
			await commands.testCi({ testEnv: argv.env })
			// process.exit(exitCode)
		}
	)
	.command(
		'test:local',
		'run webdriver tests locally',
		(yargs) => {
			return yargs
				.option('browser', {
					alias: 'b',
					type: 'array',
					description: 'run with browsers',
					choices: ['chrome', 'firefox', 'safari', 'edge', 'vscode'],
					default: ['chrome'],
				})
				.option('os', {
					type: 'string',
					description: 'OS to run on (experimental)',
					choices: [process.platform, 'linux'],
					default: process.platform,
				})
		},
		async (argv) => {
			const exitCode = await commands.testLocal(argv)
			process.exit(exitCode)
		}
	)
	.command(
		'test:browserstack',
		'run webdriver tests on browserstack',
		(yargs) => {
			return yargs
				.option('browser', {
					alias: 'b',
					type: 'array',
					description: 'run with browsers',
					choices: ['chrome', 'firefox', 'safari', 'edge'],
					default: ['chrome'],
				})
				.option('os', {
					type: 'array',
					description: 'OS to run on (experimental)',
					choices: [process.platform, 'linux'],
					default: [process.platform],
				})
		},
		async (argv) => {
			const exitCode = await commands.testBrowserstack(argv)
			process.exit(exitCode)
		}
	)
	.command(
		'selenium:grid',
		'start selenium grid (test linux)',
		(yargs) => {
			return yargs
		},
		async () => {
			const exitCode = await commands.seleniumGrid()
			process.exit(exitCode)
		}
	)
	.strict()
	.parse()
