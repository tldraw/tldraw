import kleur from 'kleur'
import path, { join, relative } from 'path'
import {
	REPO_ROOT,
	readFileIfExists,
	readJsonIfExists,
	writeCodeFile,
	writeJsonFile,
} from './lib/file'
import { nicelog } from './lib/nicelog'
import { Package, getAllWorkspacePackages } from './lib/workspace'

const packagesWithoutTSConfigs: ReadonlySet<string> = new Set(['config'])

// all packages should have these scripts
const expectedPackageJsonScriptsForAll = {
	lint: tsScript('lint.ts'),
}

const expectedTestScripts = {
	test: () => 'yarn run -T vitest --passWithNoTests',
	'test-ci': () => 'yarn run -T vitest run --passWithNoTests',
	'test-coverage': () => 'yarn run -T vitest run --coverage --passWithNoTests',
}

// packages (in packages/) should have these scripts
const expectedPackageJsonScriptsForLibraries = {
	...expectedPackageJsonScriptsForAll,
	...expectedTestScripts,
}

const expectedPackageJsonScriptsForApps = {
	...expectedPackageJsonScriptsForAll,
	...expectedTestScripts,
}

// published packages should have these scripts
const expectedPackageJsonScriptsForPublishedLibraries = {
	...expectedPackageJsonScriptsForLibraries,
	build: tsScript('build-package.ts'),
	'build-api': tsScript('build-api.ts'),
	prepack: tsScript('prepack.ts'),
	postpack: (packageDir: string) => scriptPath(packageDir, 'postpack.sh'),
	'pack-tarball': () => 'yarn pack',
}

// individual packages can have different scripts than the above if needed
const packageJsonScriptExceptions: Record<string, Record<string, () => string | undefined>> = {
	config: {
		lint: () => undefined,
	},
	tsconfig: {
		lint: () => undefined,
	},
	'@tldraw/monorepo': {
		lint: () => 'lazy lint',
	},
	'@tldraw/assets': {
		test: () => undefined,
		'test-ci': () => undefined,
		build: () => undefined,
		'build-api': () => undefined,
		prepack: () => undefined,
		postpack: () => undefined,
	},
	'create-tldraw': {
		build: () => './scripts/build.sh',
		'build-api': () => undefined,
		prepack: () => 'yarn build',
		postpack: () => undefined,
	},
}

async function checkPackageJsonScripts({
	packages,
	fix,
}: {
	packages: Package[]
	fix: boolean
}): Promise<boolean> {
	const needsFix = new Set()

	let errorCount = 0
	for (const { path: packageDir, relativePath, packageJson, name } of packages) {
		if (!packageJson.scripts) {
			packageJson.scripts = {}
		}
		const packageScripts = packageJson.scripts

		let expected = relativePath.startsWith('packages/')
			? packageJson.private
				? expectedPackageJsonScriptsForLibraries
				: expectedPackageJsonScriptsForPublishedLibraries
			: relativePath.startsWith('apps/')
				? expectedPackageJsonScriptsForApps
				: expectedPackageJsonScriptsForAll

		if (packageJsonScriptExceptions[name]) {
			expected = {
				...expected,
				...packageJsonScriptExceptions[name],
			}
		}

		for (const [scriptName, getExpectedScript] of Object.entries(expected)) {
			const actualScript = packageScripts[scriptName]
			const expectedScript = getExpectedScript(packageDir)
			if (actualScript !== expectedScript) {
				nicelog(
					[
						'❌ ',
						kleur.red(`${name}: `),
						kleur.blue(`$ yarn ${scriptName}`),
						kleur.grey(' -> '),
						kleur.red(actualScript ?? '<missing>'),
						kleur.gray(' (expected: '),
						kleur.green(expectedScript),
						kleur.gray(')'),
					].join('')
				)
				packageScripts[scriptName] = expectedScript
				needsFix.add(name)
				errorCount++
			} else {
				nicelog(
					[
						'✅ ',
						kleur.green(`${name}: `),
						kleur.blue(`$ yarn ${scriptName}`),
						kleur.grey(' -> '),
						kleur.green(actualScript ?? '<missing>'),
					].join('')
				)
			}
		}
	}

	if (errorCount) {
		if (fix) {
			for (const { packageJson, name, relativePath } of packages) {
				if (needsFix.has(name)) {
					nicelog(kleur.yellow(`Fixing ${name}...`))
					await writeJsonFile(path.join(REPO_ROOT, relativePath, 'package.json'), packageJson)
				}
			}
			nicelog(kleur.yellow(`Fixed ${errorCount} errors`))
			return true
		} else {
			nicelog(kleur.red(`Found ${errorCount} errors`))
			return false
		}
	}

	return true
}

async function checkTsConfigs({
	packages,
	fix,
}: {
	fix: boolean
	packages: Package[]
}): Promise<boolean> {
	let numErrors = 0

	for (const workspace of packages) {
		const tsconfigPath = join(workspace.path, 'tsconfig.json')
		if (packagesWithoutTSConfigs.has(workspace.name)) {
			continue
		}

		const tsconfig = (await readJsonIfExists(tsconfigPath)) as {
			references?: { path: string }[]
		}
		if (!tsconfig) {
			throw new Error('No tsconfig.json found at ' + tsconfigPath)
		}

		const tldrawDeps = Object.keys({
			...workspace.packageJson.dependencies,
			...workspace.packageJson.devDependencies,
		}).filter((dep) => packages.some((p) => p.name === dep))

		const fixedDeps = []
		const missingRefs = []
		const currentRefs = new Set<string>([...(tsconfig.references?.map((ref) => ref.path) ?? [])])
		for (const dep of tldrawDeps) {
			// construct the expected path to the dependency's tsconfig
			const matchingWorkspace = packages.find((p) => p.name === dep)
			if (!matchingWorkspace) {
				throw new Error(`No workspace found for ${dep}`)
			}
			const tsconfigReferencePath = relative(workspace.path, matchingWorkspace.path)
			fixedDeps.push({ path: tsconfigReferencePath })
			if (currentRefs.has(tsconfigReferencePath)) {
				currentRefs.delete(tsconfigReferencePath)
			} else {
				missingRefs.push(dep)
			}
		}

		fixedDeps.sort((a, b) => a.path.localeCompare(b.path))

		if (currentRefs.size > 0) {
			if (fix) {
				tsconfig.references = fixedDeps
				await writeJsonFile(tsconfigPath, tsconfig)
			} else {
				numErrors++
				nicelog(
					[
						'❌ ',
						kleur.red(`${workspace.name}: `),
						kleur.blue(relative(process.cwd(), tsconfigPath)),
						kleur.grey(' has unnecessary reference(s) to '),
						kleur.red([...currentRefs].join(', ')),
					].join('')
				)
			}
		}
		if (missingRefs.length) {
			if (fix) {
				tsconfig.references = fixedDeps
				await writeJsonFile(tsconfigPath, tsconfig)
			} else {
				numErrors++
				nicelog(
					[
						'❌ ',
						kleur.red(`${workspace.name}: `),
						kleur.blue(relative(process.cwd(), tsconfigPath)),
						kleur.grey(' is missing reference(s) to '),
						kleur.red(missingRefs.join(', ')),
					].join('')
				)
				nicelog('The references entry should look like this:')
				nicelog('"references": ' + JSON.stringify(fixedDeps, null, 2))
			}
		}

		if (currentRefs.size === 0 && missingRefs.length === 0) {
			nicelog(['✅ ', kleur.green(`${workspace.name}`)].join(''))
		}
	}
	if (numErrors > 0) {
		nicelog('Run `yarn check-tsconfigs --fix` to fix these problems')
		return false
	}

	return true
}

function scriptPath(packageDir: string, scriptName: string) {
	return path.relative(packageDir, path.join(__dirname, scriptName))
}

function tsScript(scriptName: string) {
	return (packageDir: string) => `yarn run -T tsx ${scriptPath(packageDir, scriptName)}`
}

async function checkLibraryContents({
	fix,
	packages,
}: {
	fix: boolean
	packages: Package[]
}): Promise<boolean> {
	let errorCount = 0

	for (const { packageJson, name, path } of packages) {
		if (packageJson.private) continue

		const sourceFilePath = join(path, 'src', 'index.ts')
		const sourceFileContents = await readFileIfExists(sourceFilePath)
		if (!sourceFileContents) {
			nicelog(['⏩ ', kleur.blue(`${name}: `), 'skipped (no src/index.ts)'].join(''))
			continue
		}

		const search = [
			'registerTldrawLibraryVersion(',
			'\t(globalThis as any).TLDRAW_LIBRARY_NAME,',
			'\t(globalThis as any).TLDRAW_LIBRARY_VERSION,',
			'\t(globalThis as any).TLDRAW_LIBRARY_MODULES',
			')',
		].join('\n')

		if (sourceFileContents.includes(search)) {
			nicelog(['✅ ', kleur.green(name)].join(''))
			continue
		}

		errorCount++
		if (fix) {
			const newSourceFileContents = [
				"import {registerTldrawLibraryVersion} from '@tldraw/utils'",
				sourceFileContents,
				'',
				'registerTldrawLibraryVersion(',
				'(globalThis as any).TLDRAW_LIBRARY_NAME,',
				'(globalThis as any).TLDRAW_LIBRARY_VERSION,',
				'(globalThis as any).TLDRAW_LIBRARY_NAME',
				')',
			].join('\n')

			await writeCodeFile(null, 'typescript', sourceFilePath, newSourceFileContents)
			nicelog(
				[
					'⚠️ ',
					kleur.yellow(`${name}: `),
					'added call to ',
					kleur.blue('registerTldrawLibraryVersion'),
				].join('')
			)
		} else {
			nicelog(
				[
					'❌ ',
					kleur.red(`${name}: `),
					'missing call to ',
					kleur.blue('registerTldrawLibraryVersion'),
				].join('')
			)
		}
	}

	if (errorCount) {
		if (fix) {
			nicelog(kleur.yellow(`Fixed ${errorCount} errors`))
			return true
		} else {
			nicelog(kleur.red(`Found ${errorCount} errors`))
			return false
		}
	}

	return true
}

async function group<T>(name: string, cb: () => Promise<T>) {
	console.group(name)
	try {
		return await cb()
	} finally {
		console.groupEnd()
		console.log('')
	}
}

async function main({ fix }: { fix: boolean }) {
	const packages = await getAllWorkspacePackages()

	const scriptsOk = await group('Checking package.json scripts...', () =>
		checkPackageJsonScripts({ packages, fix })
	)
	const tsConfigsOk = await group('Checking tsconfig.json files...', () =>
		checkTsConfigs({ packages, fix })
	)
	const libsOk = await group('Checking library source files...', () =>
		checkLibraryContents({ packages, fix })
	)

	if (!scriptsOk || !tsConfigsOk || !libsOk) {
		process.exit(1)
	}
}

main({
	fix: process.argv.includes('--fix'),
})
