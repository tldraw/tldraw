import { parse as parseArgs } from '@bomb.sh/args'
import { intro, outro, select, spinner, text } from '@clack/prompts'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path, { relative, resolve } from 'node:path'
import process from 'node:process'
import { Readable } from 'node:stream'
import picocolors from 'picocolors'
import * as tar from 'tar'
import { groupSelect, GroupSelectOption } from './group-select'
import { Template, TEMPLATES } from './templates'
import {
	cancel,
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
import { wrapAnsi } from './wrap-ansi'

const DEBUG = !!process.env.DEBUG

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
		nicelog(getHelp())
		process.exit(0)
	}

	const maybeTargetDir = args._[0] ? formatTargetDir(resolve(String(args._[0]))) : undefined
	const targetDir = maybeTargetDir ?? process.cwd()

	const template = await templatePicker(args.template)
	const name = await namePicker(maybeTargetDir)

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
	doneMessage.push('')
	doneMessage.push('   Happy building!')

	outro(doneMessage.join('\n'))
}

main().catch((err) => {
	if (DEBUG) console.error(err)
	outro(`it's bad`)
	process.exit(1)
})

async function templatePicker(argOption?: string) {
	if (argOption) {
		const template = TEMPLATES.find((t) => formatTemplateId(t) === argOption.toLowerCase().trim())

		if (!template) {
			outro(`Template ${argOption} not found`)
			process.exit(1)
		}

		return template
	}

	return await handleCancel(
		groupSelect({
			message: 'Select a template:',
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
		cancel()
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

function formatTemplateId(template: Template) {
	return template.name.trim().toLowerCase().replace(/\s+/g, '-')
}

function getHelp() {
	const options = [
		{ flags: '-h, --help', description: 'Display this help message.' },
		{ flags: '-t, --template NAME', description: 'Use a specific template.' },
		{ flags: '-o, --overwrite', description: 'Overwrite the target directory if it exists.' },
	]

	const GAP_SIZE = 2
	const optionPrefix = '   '
	const templatePrefix = ' • '

	const idealIndentSize =
		Math.max(
			...options.map((o) => o.flags.length),
			...TEMPLATES.map((t) => formatTemplateId(t).length)
		) +
		GAP_SIZE +
		templatePrefix.length

	const isNarrow = process.stdout.columns < idealIndentSize + 50

	const lines = [
		picocolors.bold('Usage: create-tldraw [OPTION]... [DIRECTORY]'),
		'',
		'Create a new tldraw project.',
		"With no arguments, you'll be guided through an interactive setup.",
		'',
		picocolors.bold('Options:'),
	]

	if (isNarrow) {
		const indent = ' '.repeat(optionPrefix.length + GAP_SIZE)
		for (const option of options) {
			lines.push(`${optionPrefix}${option.flags}`)
			lines.push(wrapAnsi(`${indent}${option.description}`, process.stdout.columns, { indent }))
		}
	} else {
		const indent = ' '.repeat(idealIndentSize)
		for (const option of options) {
			const start = `${optionPrefix}${option.flags}`.padEnd(idealIndentSize, ' ')
			lines.push(wrapAnsi(`${start}${option.description}`, process.stdout.columns, { indent }))
		}
	}

	lines.push('')
	lines.push(picocolors.bold('Available starter kits:'))

	if (isNarrow) {
		const indent = ' '.repeat(templatePrefix.length + GAP_SIZE)
		for (const template of TEMPLATES) {
			lines.push(`${templatePrefix}${formatTemplateId(template)}`)
			lines.push(
				wrapAnsi(
					`${indent}${template.shortDescription ?? template.description}`,
					process.stdout.columns,
					{ indent }
				)
			)
		}
	} else {
		const indent = ' '.repeat(idealIndentSize)
		for (const template of TEMPLATES) {
			const start = `${templatePrefix}${formatTemplateId(template)}`.padEnd(idealIndentSize, ' ')
			lines.push(
				wrapAnsi(
					`${start}${template.shortDescription ?? template.description}`,
					process.stdout.columns,
					{
						indent,
					}
				)
			)
		}
	}

	lines.push('')

	return lines.join('\n')
}
