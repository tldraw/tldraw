import { parse as parseArgs } from '@bomb.sh/args'
import { intro, outro, select, spinner, text } from '@clack/prompts'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path, { relative, resolve } from 'node:path'
import process from 'node:process'
import { Readable } from 'node:stream'
import picocolors from 'picocolors'
import * as tar from 'tar'
import { groupSelect } from './group-select'
import { Template, TEMPLATES } from './templates'
import {
	emptyDir,
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

const DEBUG = !!process.env.DEBUG

const allTemplates = [...TEMPLATES.framework, ...TEMPLATES.app]

const HELP = `\
Usage: create-tldraw [OPTION]... [DIRECTORY]

Create a new project using tldraw.
With no arguments, start the CLI in interactive mode.

Options:
  -h, --help                 display this help message
  -t, --template NAME        use a specific template
  -o, --overwrite            overwrite the target directory if it exists

Available templates:
${allTemplates.map((t) => ` • ${t.repo.replace(/^tldraw\//, '')}`).join('\n')}
`

async function main() {
	intro(`Let's build a tldraw app!`)

	const args = parseArgs(process.argv.slice(2), {
		alias: {
			h: 'help',
			t: 'template',
			o: 'overwrite',
		},
		boolean: ['help', 'overwrite'],
		string: ['template'],
	})

	if (args.help) {
		nicelog(HELP)
		process.exit(0)
	}

	const targetDir = args._[0] ? formatTargetDir(resolve(String(args._[0]))) : process.cwd()

	const template = await templatePicker(args.template)
	const name = await namePicker(targetDir)

	await ensureDirectoryEmpty(targetDir, args.overwrite)
	await downloadTemplate(template, targetDir)
	await renameTemplate(name, targetDir)

	const manager = getPackageManager()
	const doneMessage = ['Done! Now run:', '']
	if (targetDir !== process.cwd()) {
		doneMessage.push(`   cd ${relative(process.cwd(), targetDir)}`)
	}
	doneMessage.push(`   ${getInstallCommand(manager)}`)
	doneMessage.push(`   ${getRunCommand(manager, 'dev')}`)

	outro(doneMessage.join('\n'))
}

main().catch((err) => {
	if (DEBUG) console.error(err)
	outro(`it's bad`)
	process.exit(1)
})

async function templatePicker(argOption?: string) {
	if (argOption) {
		const template = allTemplates.find((t) => {
			return (
				t.repo.replace(/^tldraw\//, '').toLowerCase() === argOption.toLowerCase() ||
				t.name.toLowerCase() === argOption.toLowerCase()
			)
		})

		if (!template) {
			outro(`Template ${argOption} not found`)
			process.exit(1)
		}

		return template
	}

	function formatTemplates(templates: Template[], groupLabel: string) {
		return templates.map((template) => ({
			label: template.name,
			hint: template.description,
			value: template,
			group: groupLabel,
		}))
	}

	return await handleCancel(
		groupSelect({
			message: 'Select a template',
			options: [
				...formatTemplates(TEMPLATES.framework, 'Frameworks'),
				...formatTemplates(TEMPLATES.app, 'Apps'),
			],
		})
	)
}

async function namePicker(argOption?: string) {
	if (argOption) {
		return pathToName(argOption)
	}

	const defaultName = pathToName(process.cwd())

	const name = await handleCancel(
		text({
			message: picocolors.bold('Name your package'),
			placeholder: defaultName,
			validate: (value) => {
				if (value && !isValidPackageName(value)) {
					return `Invalid package name: ${value}`
				}

				return undefined
			},
		})
	)

	if (!name.trim()) return defaultName
	return pathToName(name)
}

async function ensureDirectoryEmpty(targetDir: string, overwriteArg: boolean) {
	if (isDirEmpty(targetDir)) {
		mkdirSync(targetDir, { recursive: true })
		return
	}

	const overwrite = overwriteArg
		? 'yes'
		: await select({
				message: picocolors.bold(
					(targetDir === process.cwd()
						? 'Current directory'
						: `Target directory "${path.relative(process.cwd(), targetDir)}"`) + ` is not empty.`
				),
				options: [
					{
						label: 'Cancel',
						value: 'no',
					},
					{
						label: 'Remove existing files and continue',
						value: 'yes',
					},
					{
						label: 'Ignore existing files and continue',
						value: 'ignore',
					},
				],
			})

	if (overwrite === 'no') {
		outro(`it's cancelled`)
		process.exit(1)
	}

	if (overwrite === 'yes') {
		emptyDir(targetDir)
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
