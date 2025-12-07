import { copyFile, mkdir, mkdtemp, readdir, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { exec } from './lib/exec'
import { readJsonIfExists, REPO_ROOT, writeCodeFile, writeJsonFile } from './lib/file'
import { EXPORT_CONFIG_KEY, PackageJson, TsConfigJson } from './lib/types'

const TEMPLATE_DIR = join(REPO_ROOT, 'templates')

async function main() {
	const templateName = process.argv[2]
	if (!templateName) {
		console.log('Usage: tsx prepare-template-for-export.ts <template-name>')
		process.exit(1)
	}

	const possibleTemplates = (await readdir(TEMPLATE_DIR, { withFileTypes: true }))
		.filter((d) => d.isDirectory())
		.map((d) => d.name)

	if (!possibleTemplates.includes(templateName)) {
		console.log(`Template "${templateName}" not found.`)
		console.log(`Possible templates: ${possibleTemplates.join(', ')}`)
		process.exit(1)
	}

	const sourceDir = join(REPO_ROOT, 'templates', templateName)
	const githubAuth = getGithubAuth()

	// make a temporary working dir:
	const workingDir = await mkdtemp(join(tmpdir(), `template-export-${templateName}`))
	console.log(`Working in ${workingDir}`)

	// read the package.json:
	const packageJsonRaw = await readJsonIfExists(join(sourceDir, 'package.json'))
	if (!packageJsonRaw) {
		console.log('No package.json found')
		process.exit(1)
	}

	const packageJson = PackageJson.validate(packageJsonRaw)
	const exportConfig = packageJson[EXPORT_CONFIG_KEY]
	if (!exportConfig) {
		console.log('No export config found in package.json.')
		console.log(`Please add a "${EXPORT_CONFIG_KEY}" key to your package.json.`)
		console.log('Skipping for now.')
		process.exit(0)
	}

	// clone the template repo:
	const repoUrl = `https://${githubAuth}github.com/${exportConfig.repo}.git`
	console.log(`Cloning ${repoUrl}...`)
	await exec('git', ['clone', repoUrl, workingDir, '--depth', '1'])

	console.log('Clearing old files...')
	const oldFiles = (await readdir(workingDir)).filter((f) => f !== '.git')
	for (const file of oldFiles) {
		await rm(join(workingDir, file), { recursive: true })
	}

	console.log('Copying files to export dir...')
	const templateRepoPrefix = `templates/${templateName}/`
	const templateFiles = (await exec('git', ['ls-files', templateRepoPrefix]))
		.split('\n')
		.map((s) => s.replace(templateRepoPrefix, ''))
		.filter((s) => s.trim())

	await mkdir(workingDir, { recursive: true })

	for (const file of templateFiles) {
		const targetFile = join(workingDir, file)
		await mkdir(dirname(targetFile), { recursive: true })
		if (isTypeScriptSourceFile(file)) {
			const source = await readFile(join(REPO_ROOT, templateRepoPrefix, file), 'utf-8')
			const cleanedSource = source.replace(
				/\/\* EXCLUDE_FROM_TEMPLATE_EXPORT_START \*\/(.*?)\/\* EXCLUDE_FROM_TEMPLATE_EXPORT_END \*\//gs,
				''
			)
			await writeCodeFile(null, 'typescript', targetFile, cleanedSource)
		} else {
			await copyFile(join(REPO_ROOT, templateRepoPrefix, file), targetFile)
		}
	}

	console.log('Cleaning package.json...')
	delete packageJson[EXPORT_CONFIG_KEY]

	if (exportConfig?.scripts) {
		if (!packageJson.scripts) {
			packageJson.scripts = {}
		}
		for (const [name, script] of Object.entries(exportConfig.scripts)) {
			if (script === null) {
				delete packageJson.scripts[name]
			} else {
				packageJson.scripts[name] = script
			}
		}
	}

	await setWorkspaceDependenciesToLatest(packageJson.dependencies)
	await setWorkspaceDependenciesToLatest(packageJson.devDependencies)
	await setWorkspaceDependenciesToLatest(packageJson.peerDependencies)

	await writeJsonFile(join(workingDir, 'package.json'), packageJson)

	console.log('Cleaning tsconfig.json...')
	const tsconfigJsonRaw = await readJsonIfExists(join(workingDir, 'tsconfig.json'))
	if (!tsconfigJsonRaw) {
		console.log('No tsconfig.json found')
		process.exit(1)
	}

	const tsconfigJson = TsConfigJson.validate(tsconfigJsonRaw)
	if (tsconfigJson.references) {
		tsconfigJson.references = tsconfigJson.references.filter((ref) => !ref.path.startsWith('.'))
		if (tsconfigJson.references.length === 0) {
			delete tsconfigJson.references
		}
	}

	await writeJsonFile(join(workingDir, 'tsconfig.json'), tsconfigJson)

	console.log('Committing...')
	const latestTldrawVersion = await getLatestPackageVersion('tldraw')
	await exec('git', ['add', '.'], { pwd: workingDir })
	await exec(
		'git',
		['commit', '--allow-empty', '-m', `update from tldraw ${latestTldrawVersion}`],
		{ pwd: workingDir }
	)

	console.log('Pushing...')
	await exec('git', ['push', repoUrl, 'main'], { pwd: workingDir })

	console.log('Cleaning up temp dir...')
	await rm(workingDir, { recursive: true })

	console.log('Done!')
}

function getGithubAuth() {
	const githubToken = process.env.GITHUB_TOKEN
	if (!githubToken) return ''

	return `huppy-bot:${githubToken}@`
}

async function setWorkspaceDependenciesToLatest(dependencies?: Record<string, string>) {
	if (!dependencies) return
	for (const [name, version] of Object.entries(dependencies)) {
		if (version.startsWith('workspace:')) {
			const latestVersion = await getLatestPackageVersion(name)
			dependencies[name] = `^${latestVersion}`
		}
	}
}

async function getLatestPackageVersion(packageName: string) {
	const latestVersion = await exec('npm', ['view', `${packageName}@latest`, 'version'])
	return latestVersion.trim()
}

function isTypeScriptSourceFile(path: string) {
	return path.endsWith('.ts') || path.endsWith('.tsx')
}

main()
