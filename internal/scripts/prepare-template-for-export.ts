import { T } from '@tldraw/validate'
import { copyFile, mkdir, readdir, readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { exec } from './lib/exec'
import { readJsonIfExists, REPO_ROOT, writeCodeFile, writeJsonFile } from './lib/file'

const EXPORT_CONFIG_KEY = '==TLDRAW TEMPLATE EXPORT==' as const
const ExportConfig = T.object({
	scripts: T.dict(T.string, T.nullable(T.string)),
})
const PackageJson = T.object({
	[EXPORT_CONFIG_KEY]: ExportConfig.optional(),
	scripts: T.dict(T.string, T.nullable(T.string)),
	dependencies: T.dict(T.string, T.string).optional(),
	devDependencies: T.dict(T.string, T.string).optional(),
	peerDependencies: T.dict(T.string, T.string).optional(),
}).allowUnknownProperties()

const TsConfigJson = T.object({
	references: T.arrayOf(
		T.object({
			path: T.string,
		})
	).optional(),
}).allowUnknownProperties()

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

	const templateRepoPrefix = `templates/${templateName}/`
	const templateFiles = (await exec('git', ['ls-files', templateRepoPrefix]))
		.split('\n')
		.map((s) => s.replace(templateRepoPrefix, ''))
		.filter((s) => s.trim())

	const exportDir = join(REPO_ROOT, 'templates-export', templateName)
	await mkdir(exportDir, { recursive: true })

	console.log('Copying files to export dir...')
	for (const file of templateFiles) {
		const targetFile = join(exportDir, file)
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
	const packageJsonRaw = await readJsonIfExists(join(exportDir, 'package.json'))
	if (!packageJsonRaw) {
		console.log('No package.json found')
		process.exit(1)
	}

	const packageJson = PackageJson.validate(packageJsonRaw)
	const exportConfig = packageJson[EXPORT_CONFIG_KEY]
	delete packageJson[EXPORT_CONFIG_KEY]

	if (exportConfig?.scripts) {
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

	await writeJsonFile(join(exportDir, 'package.json'), packageJson)

	console.log('Cleaning tsconfig.json...')
	const tsconfigJsonRaw = await readJsonIfExists(join(exportDir, 'tsconfig.json'))
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

	await writeJsonFile(join(exportDir, 'tsconfig.json'), tsconfigJson)

	console.log('Ready for export!')
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
