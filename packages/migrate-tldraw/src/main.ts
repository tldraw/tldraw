/**
 * tldraw-migrate CLI entry. Parses argv, picks a transform (by name or by
 * auto-detected major version), runs the engine over the target directory,
 * and prints either a human or JSON report.
 *
 * Exit codes:
 *   0  — clean run, no flags reported
 *   1  — flags reported (manual review required)
 *   2  — error
 */

import * as path from 'node:path'
import * as readline from 'node:readline'
import { detectInstalledVersion } from './lib/detectVersion'
import { CSS_EXTS, TS_EXTS, findFiles } from './lib/findFiles'
import { detectPackageManager, getInstallCommand } from './lib/packageManager'
import { processFileOnDisk } from './lib/processFile'
import { formatHuman, formatJson } from './lib/report'
import { colors, setColorEnabled } from './lib/colors'
import type { FileResult } from './lib/types'
import { TRANSFORMS, getTransformById, getTransformForMajor } from './transforms'

interface ParsedArgs {
	help: boolean
	version: boolean
	dryRun: boolean
	skipCss: boolean
	json: boolean
	noColor: boolean
	yes: boolean
	transformId?: string
	directory?: string
}

function parseArgs(argv: readonly string[]): ParsedArgs {
	const out: ParsedArgs = {
		help: false,
		version: false,
		dryRun: false,
		skipCss: false,
		json: false,
		noColor: false,
		yes: false,
	}
	const positional: string[] = []
	for (const arg of argv) {
		switch (arg) {
			case '-h':
			case '--help':
				out.help = true
				break
			case '-v':
			case '--version':
				out.version = true
				break
			case '--dry-run':
				out.dryRun = true
				break
			case '--no-css':
				out.skipCss = true
				break
			case '--json':
				out.json = true
				break
			case '--no-color':
				out.noColor = true
				break
			case '--yes':
			case '-y':
				out.yes = true
				break
			default:
				if (arg.startsWith('--')) {
					console.error(`Unknown option: ${arg}`)
					process.exit(2)
				}
				positional.push(arg)
		}
	}

	if (positional.length > 0) {
		// First positional may be a transform id; otherwise it's the directory.
		const first = positional[0]
		if (getTransformById(first)) {
			out.transformId = first
			out.directory = positional[1]
		} else {
			out.directory = first
		}
	}
	return out
}

function printHelp(): void {
	const lines: string[] = []
	lines.push('Usage: tldraw-migrate [TRANSFORM] [DIRECTORY] [OPTIONS]')
	lines.push('')
	lines.push('Transforms:')
	for (const t of TRANSFORMS) {
		lines.push(`  ${t.id.padEnd(18)} ${t.summary}`)
	}
	lines.push('')
	lines.push('Options:')
	lines.push('  -h, --help        Display this help message')
	lines.push('  -v, --version     Print the CLI version')
	lines.push('      --dry-run     Report changes without writing files')
	lines.push('      --no-css      Skip .css/.scss/.less files')
	lines.push('      --json        Emit a machine-readable JSON report (no auto-fixes)')
	lines.push('      --no-color    Disable ANSI colors')
	lines.push('  -y, --yes         Skip confirmation prompts')
	lines.push('')
	lines.push(
		'With no arguments the CLI auto-detects the installed tldraw version and runs'
	)
	lines.push('the matching transform.')
	console.log(lines.join('\n'))
}

function getCliVersion(): string {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const pkg = require('../package.json')
		return String(pkg.version ?? '0.0.0')
	} catch {
		return '0.0.0'
	}
}

async function confirm(question: string): Promise<boolean> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
	return new Promise((resolve) => {
		rl.question(`${question} [Y/n] `, (answer) => {
			rl.close()
			const a = answer.trim().toLowerCase()
			resolve(a === '' || a === 'y' || a === 'yes')
		})
	})
}

async function main(): Promise<number> {
	const args = parseArgs(process.argv.slice(2))

	if (args.noColor) setColorEnabled(false)

	if (args.help) {
		printHelp()
		return 0
	}
	if (args.version) {
		console.log(getCliVersion())
		return 0
	}

	const targetDir = path.resolve(args.directory ?? '.')
	const useJson = args.json
	const dryRun = useJson ? true : args.dryRun

	let transform = args.transformId ? getTransformById(args.transformId) : undefined

	if (!transform) {
		const detected = detectInstalledVersion({ cwd: targetDir })
		if (!detected) {
			console.error(
				colors.red(
					'Could not detect an installed tldraw version. Pass an explicit transform: tldraw-migrate v4-to-v5 .'
				)
			)
			return 2
		}
		transform = getTransformForMajor(detected.major)
		if (!transform) {
			console.error(
				colors.red(
					`No transform found for tldraw v${detected.major}.x. Pass an explicit transform with --help to see the list.`
				)
			)
			return 2
		}
		if (!useJson) {
			console.log(
				colors.dim(
					`Detected ${detected.source}@${detected.version} (range "${detected.rawRange}") in ${targetDir}/package.json`
				)
			)
			console.log(
				colors.dim(
					`Will run transform: ${colors.bold(transform.id)} (${transform.title})`
				)
			)
			if (!args.yes) {
				const ok = await confirm('Proceed?')
				if (!ok) return 0
			}
		}
	}

	const start = Date.now()

	const tsFiles = findFiles(targetDir, { extensions: TS_EXTS, selfPath: __filename })
	const cssFiles = args.skipCss
		? []
		: findFiles(targetDir, { extensions: CSS_EXTS, selfPath: __filename })

	const results: FileResult[] = []
	for (const file of tsFiles) {
		results.push(processFileOnDisk(file, transform, false, { dryRun }))
	}
	for (const file of cssFiles) {
		results.push(processFileOnDisk(file, transform, true, { dryRun }))
	}

	const summary = {
		transform,
		targetDir,
		results,
		dryRun,
		durationMs: Date.now() - start,
	}

	if (useJson) {
		console.log(formatJson(summary))
	} else {
		console.log(formatHuman(summary))
		printNextSteps(targetDir, summary.results)
	}

	const totalFlags = results.reduce((acc, r) => acc + r.flags.length, 0)
	return totalFlags > 0 ? 1 : 0
}

function printNextSteps(targetDir: string, results: FileResult[]): void {
	const totalFlags = results.reduce((acc, r) => acc + r.flags.length, 0)
	if (totalFlags === 0) return
	const manager = detectPackageManager(targetDir)
	const lines: string[] = []
	lines.push(colors.bold('Next steps:'))
	lines.push(`  1. Run your typecheck (e.g. ${colors.cyan('tsc --noEmit')}) to surface type errors.`)
	lines.push(
		`  2. See the bundled SKILL.md for guided remediation: ${colors.dim('node_modules/@tldraw/migrate/skills/SKILL.md')}`
	)
	lines.push(
		`  3. After fixes, run ${colors.cyan(getInstallCommand(manager))} to refresh your lockfile.`
	)
	lines.push('')
	console.log(lines.join('\n'))
}

main()
	.then((code) => process.exit(code))
	.catch((err) => {
		console.error(err)
		process.exit(2)
	})
