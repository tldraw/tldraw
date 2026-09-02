import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import { Readable } from 'node:stream'
import { parse as parseArgs } from '@bomb.sh/args'
import { outro, spinner, text } from '@clack/prompts'
import picocolors from 'picocolors'
import * as tar from 'tar'
import { groupSelect, GroupSelectOption } from './group-select'
import { Template, TEMPLATES } from './templates'
import {
	formatTargetDir,
	getInstallCommand,
	getPackageManager,
	getRunCommand,
	uncancel as handleCancel,
	isDirEmpty,
	isValidPackageName,
	nicelog,
	pathToName,
} from './utils'
import { wrapAnsi } from './wrap-ansi'

const DEBUG = !!process.env.DEBUG

async function main() {
	const args = parseArgs(process.argv.slice(2), {
		alias: {
			h: 'help',
			t: 'template',
		},
		boolean: ['help', 'no-telemetry'],
		string: ['template'],
	})

	if (args.help) {
		nicelog(getHelp())
		process.exit(0)
	}

	const maybeTargetDir = args._[0] ? formatTargetDir(resolve(String(args._[0]))) : undefined

	const template = await templatePicker(args.template, args['no-telemetry'])
	const name = await namePicker(maybeTargetDir)

	const requestedDir = maybeTargetDir ?? resolve(process.cwd(), name)
	const targetDir = findAvailableDir(requestedDir)
	mkdirSync(targetDir, { recursive: true })

	await downloadTemplate(template, targetDir)
	await renameTemplate(name, targetDir)

	const manager = getPackageManager()
	const doneMessage = ['Done! Now run:', '']
	if (targetDir !== process.cwd()) {
		doneMessage.push(`   cd ${relative(process.cwd(), targetDir)}`)
	}
	doneMessage.push(`   ${getInstallCommand(manager)}`)
	doneMessage.push(`   ${getRunCommand(manager, 'dev')}`)
	doneMessage.push('')
	doneMessage.push('   Happy building! Visit https://tldraw.dev/docs to learn more.')

	outro(doneMessage.join('\n'))
}

main().catch((err) => {
	if (DEBUG) console.error(err)
	outro(`it's bad`)
	process.exit(1)
})

async function templatePicker(argOption?: string, noTelemetry?: boolean) {
	let template: Template
	if (argOption) {
		const found = TEMPLATES.find((t) => formatTemplateId(t) === argOption.toLowerCase().trim())
		if (!found) {
			outro(`Template ${argOption} not found`)
			process.exit(1)
		}
		template = found
	} else {
		template = await handleCancel(
			groupSelect({
				message: 'Select a tldraw starter kit:',
				options: TEMPLATES.map(
					(template): GroupSelectOption<Template> => ({
						label: template.name,
						hint: template.description,
						value: template,
					})
				),
			})
		)
	}

	trackStarterKitChoice(template.name, noTelemetry)
	return template
}

const TELEMETRY_URLS = [
	'https://dashboard.tldraw.pro/api/starter-kit-choice',
	'https://teamldraw.com/api/starter-kit-choice',
]

function trackStarterKitChoice(templateId: string, noTelemetry?: boolean) {
	// Skip tracking if --no-telemetry flag is set
	if (noTelemetry) return

	for (const url of TELEMETRY_URLS) {
		// Fire and forget - don't block on this request
		fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: templateId }),
		}).catch(() => {
			// Silently ignore errors
		})
	}
}

async function namePicker(argOption?: string) {
	if (argOption) {
		return pathToName(argOption)
	}

	const defaultName = pathToName(process.cwd())

	const name = await handleCancel(
		text({
			message: picocolors.bold('Name your app'),
			placeholder: defaultName,
			validate: (value) => {
				if (value && !isValidPackageName(value)) {
					return `Invalid name: ${value}`
				}

				return undefined
			},
		})
	)

	if (!name.trim()) return defaultName
	return pathToName(name)
}

function findAvailableDir(targetDir: string): string {
	if (isDirEmpty(targetDir)) {
		return targetDir
	}

	// Keep the user's chosen package name, but pick a suffixed directory if the target is unavailable.
	for (let i = 1; ; i++) {
		const candidate = `${targetDir}-${i}`
		if (isDirEmpty(candidate)) {
			return candidate
		}
	}
}

async function downloadTemplate(template: Template, targetDir: string) {
	const s = spinner()
	s.start(`Downloading github.com/${template.repo}...`)
	try {
		const url = `https://github.com/${template.repo}/archive/refs/heads/main.tar.gz`
		const tarResponse = await fetch(url)
		if (!tarResponse.ok) {
			throw new Error(`${url}: ${tarResponse.status} ${tarResponse.statusText}`)
		}

		if (!tarResponse.body) {
			throw new Error(`${url}: no body`)
		}

		const extractor = tar.extract({
			cwd: targetDir,
			strip: 1,
		})

		await new Promise<void>((resolve, reject) => {
			Readable.fromWeb(tarResponse.body as any)
				.pipe(extractor)
				.on('end', resolve)
				.on('error', reject)
		})

		s.stop(`Downloaded github.com/${template.repo}`)
	} catch (err) {
		s.stop(`Failed to download github.com/${template.repo}`)
		throw err
	}
}

async function renameTemplate(name: string, targetDir: string) {
	const packageJson = JSON.parse(readFileSync(resolve(targetDir, 'package.json'), 'utf-8'))

	packageJson.name = name
	delete packageJson.author
	delete packageJson.homepage
	delete packageJson.license

	writeFileSync(resolve(targetDir, 'package.json'), JSON.stringify(packageJson, null, '\t') + '\n')
}

function formatTemplateId(template: Template) {
	return template.name.trim().toLowerCase().replace(/\s+/g, '-')
}

function getHelp() {
	const options = [
		{ flags: '-h, --help', description: 'Display this help message.' },
		{ flags: '-t, --template NAME', description: 'Use a specific template.' },
		{ flags: '--no-telemetry', description: 'Disable anonymous usage tracking.' },
	]
	const templates = TEMPLATES.map((t) => ({
		name: formatTemplateId(t),
		description: t.shortDescription ?? t.description,
	}))

	const GAP_SIZE = 2
	const optionPrefix = '   '
	const templatePrefix = ' • '

	const idealIndentSize =
		Math.max(...options.map((o) => o.flags.length), ...templates.map((t) => t.name.length)) +
		GAP_SIZE +
		templatePrefix.length

	const columns = process.stdout.columns
	const isNarrow = columns < idealIndentSize + 50

	// Wide terminals get a two-column table; narrow ones put each description on its own wrapped line.
	function formatRows(prefix: string, rows: { name: string; description: string }[]) {
		if (isNarrow) {
			const indent = ' '.repeat(prefix.length + GAP_SIZE)
			return rows.flatMap((row) => [
				`${prefix}${row.name}`,
				wrapAnsi(`${indent}${row.description}`, columns, { indent }),
			])
		}
		const indent = ' '.repeat(idealIndentSize)
		return rows.map((row) => {
			const start = `${prefix}${row.name}`.padEnd(idealIndentSize, ' ')
			return wrapAnsi(`${start}${row.description}`, columns, { indent })
		})
	}

	return [
		picocolors.bold('Usage: create-tldraw [OPTION]... [DIRECTORY]'),
		'',
		'Create a new tldraw project from a starter kit.',
		"With no arguments, you'll be guided through an interactive setup.",
		'',
		picocolors.bold('Options:'),
		...formatRows(
			optionPrefix,
			options.map((o) => ({ name: o.flags, description: o.description }))
		),
		'',
		picocolors.bold('Available starter kits:'),
		...formatRows(templatePrefix, templates),
		'',
	].join('\n')
}
