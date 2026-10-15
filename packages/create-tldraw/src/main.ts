import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import { Readable } from 'node:stream'
import { outro, select, spinner, text } from '@clack/prompts'
import picocolors from 'picocolors'
import * as tar from 'tar'
import { groupSelect, GroupSelectOption } from './group-select'
import { Template, TEMPLATES } from './templates'
import {
	cancel,
	CliArgs,
	emptyDir,
	formatTargetDir,
	getInstallCommand,
	getPackageManager,
	getRunCommand,
	uncancel as handleCancel,
	isDirEmpty,
	isValidPackageName,
	nicelog,
	parseCliArgs,
	pathToName,
} from './utils'
import { wrapAnsi } from './wrap-ansi'

const DEBUG = !!process.env.DEBUG

// tldraw.dev forwards this on to wherever the counts are actually kept, so a change there doesn't
// need a new release of this package.
const TELEMETRY_URL = 'https://tldraw.dev/api/starter-kit-choice'

async function main() {
	const args = parseCliArgs(process.argv.slice(2))

	if (args.help) {
		nicelog(getHelp())
		process.exit(0)
	}

	const maybeTargetDir = args.targetDir ? formatTargetDir(resolve(args.targetDir)) : undefined

	// Settle the directory before anything else so a cancel here doesn't waste a template pick.
	const dirAction = maybeTargetDir ? await prepareRequestedDir(maybeTargetDir) : undefined

	const template = await templatePicker(args)
	const name = await namePicker(maybeTargetDir)

	const targetDir = maybeTargetDir ?? findAvailableDir(resolve(process.cwd(), name))
	mkdirSync(targetDir, { recursive: true })

	// Only destroy existing files once every prompt has passed; a cancel or bad -t after the
	// "remove" choice must leave the directory untouched.
	if (dirAction === 'empty') emptyDir(targetDir)

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

async function templatePicker(args: CliArgs) {
	let template: Template
	if (args.template) {
		const templateId = args.template.toLowerCase().trim()
		const found = TEMPLATES.find((t) => formatTemplateId(t) === templateId)
		if (!found) {
			outro(`Template ${args.template} not found`)
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

	trackStarterKitChoice(template.name, args.telemetry)
	return template
}

function trackStarterKitChoice(templateId: string, telemetry: boolean) {
	if (!telemetry) return

	// Fire and forget - don't block on this request
	fetch(TELEMETRY_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id: templateId }),
	}).catch(() => {
		// Silently ignore errors
	})
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

type RequestedDirAction = 'ignore' | 'empty'

// A directory the user named explicitly (e.g. `.`) must not be swapped for a suffixed sibling, so ask
// what to do with its existing contents instead. Returns the choice rather than acting on it so the
// caller can defer any deletion until the rest of the setup has succeeded.
async function prepareRequestedDir(targetDir: string): Promise<RequestedDirAction | undefined> {
	if (isDirEmpty(targetDir)) return undefined

	// Show the full path for anything outside the cwd so "remove existing files" on `..` isn't a surprise.
	const relativeName = relative(process.cwd(), targetDir)
	const displayName = !relativeName ? '.' : relativeName.startsWith('..') ? targetDir : relativeName
	if (!statSync(targetDir).isDirectory()) {
		outro(`${displayName} exists and is not a directory.`)
		process.exit(1)
	}

	const action = await handleCancel(
		select<RequestedDirAction | 'cancel'>({
			message: picocolors.bold(
				`${displayName === '.' ? 'The current directory' : displayName} is not empty. How would you like to proceed?`
			),
			options: [
				{
					value: 'ignore',
					label: 'Ignore existing files and continue',
					hint: 'template files overwrite any that conflict',
				},
				{
					value: 'empty',
					label: 'Remove existing files and continue',
					hint: 'keeps .git',
				},
				{ value: 'cancel', label: 'Cancel' },
			],
		})
	)

	if (action === 'cancel') cancel()
	return action
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
		'Pass . as the directory to create the project in the current directory.',
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

// Keep this last, and keep module-level constants above main(). With -t, main() runs all the way to
// trackStarterKitChoice without ever awaiting, so a constant declared below it is still in its
// temporal dead zone when it's read: that shipped as "TELEMETRY_URLS is not iterable" (#10745).
main().catch((err) => {
	if (DEBUG) console.error(err)
	outro(`it's bad`)
	process.exit(1)
})
