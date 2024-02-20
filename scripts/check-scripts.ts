import { existsSync, readFileSync, writeFileSync } from 'fs'
import { parse } from 'json5'
import kleur from 'kleur'
import path from 'path'
import { REPO_ROOT, writeJsonFile } from './lib/file'
import { nicelog } from './lib/nicelog'
import { Package, getAllWorkspacePackages } from './lib/workspace'

function scriptPath(packageDir: string, scriptName: string) {
	return path.relative(packageDir, path.join(__dirname, scriptName))
}

function tsScript(scriptName: string) {
	return (packageDir: string) => `yarn run -T tsx ${scriptPath(packageDir, scriptName)}`
}

// all packages should have these scripts
const expectedScripts = {
	lint: tsScript('lint.ts'),
}

// packages (in packages/) should have these scripts
const expectedPackageScripts = {
	...expectedScripts,
	'test-ci': () => 'lazy inherit',
}

// published packages should have these scripts
const expectedPublishedPackageScripts = {
	...expectedPackageScripts,
	build: tsScript('build-package.ts'),
	'build-api': tsScript('build-api.ts'),
	prepack: tsScript('prepack.ts'),
	postpack: (packageDir: string) => scriptPath(packageDir, 'postpack.sh'),
	'pack-tarball': () => 'yarn pack',
}

// individual packages can have different scripts than the above if needed
const perPackageExceptions: Record<string, Record<string, () => string | undefined>> = {
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
		'test-ci': () => undefined,
		build: () => undefined,
		'build-api': () => undefined,
		prepack: () => undefined,
		postpack: () => undefined,
	},
}

const packagesWithoutTSConfigs: ReadonlySet<string> = new Set(['config'])

async function checkTsConfigs({ packages, fix }: { fix?: boolean; packages: Package[] }) {
	for (const workspace of packages) {
		const tsconfigPath = path.join(workspace.path, 'tsconfig.json')
		if (packagesWithoutTSConfigs.has(workspace.name)) {
			continue
		}

		if (!existsSync(tsconfigPath)) {
			throw new Error('No tsconfig.json found at ' + tsconfigPath)
		}

		const tsconfig = parse(readFileSync(tsconfigPath, 'utf-8'))
		const tldrawDeps = Object.keys({
			...workspace.packageJson.dependencies,
			...workspace.packageJson.devDependencies,
		}).filter((dep) => dep.startsWith('@tldraw/'))

		const fixedDeps = tsconfig.references ?? []
		const missingRefs = []
		for (const dep of tldrawDeps) {
			// construct the expected path to the dependency's tsconfig
			const matchingWorkspace = packages.find((p) => p.name === dep)
			if (!matchingWorkspace) {
				throw new Error(`No workspace found for ${dep}`)
			}
			const tsconfigReferencePath = path.relative(workspace.path, matchingWorkspace.path)
			if (
				!tsconfig.references?.some(({ path }: { path: string }) => path === tsconfigReferencePath)
			) {
				fixedDeps.push({ path: tsconfigReferencePath })
				missingRefs.push(dep)
			}
		}
		if (missingRefs.length) {
			if (fix) {
				tsconfig.references = fixedDeps.sort((a: any, b: any) => a.path.localeCompare(b.path))
				writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, '\t'), 'utf-8')
			} else {
				nicelog(
					[
						'❌ ',
						kleur.red(`${workspace.name}: `),
						kleur.blue(tsconfigPath),
						kleur.grey(' is missing references to '),
						kleur.red(missingRefs.join(', ')),
					].join('')
				)
				nicelog('The references entry should look like this:')
				nicelog('"references": ' + JSON.stringify(fixedDeps, null, 2))
				nicelog('Run `yarn check-scripts --fix` to fix this')
				process.exit(1)
			}
		}
	}
}

async function main({ fix }: { fix?: boolean }) {
	const packages = await getAllWorkspacePackages()
	const needsFix = new Set()

	await checkTsConfigs({ packages, fix })

	let errorCount = 0
	for (const { path: packageDir, relativePath, packageJson, name } of packages) {
		if (!packageJson.scripts) {
			packageJson.scripts = {}
		}
		const packageScripts = packageJson.scripts

		let expected =
			name.startsWith('@tldraw/') && relativePath.startsWith('packages/')
				? packageJson.private
					? expectedPackageScripts
					: expectedPublishedPackageScripts
				: expectedScripts

		if (perPackageExceptions[name]) {
			expected = {
				...expected,
				...perPackageExceptions[name],
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
			process.exit(0)
		} else {
			nicelog(kleur.red(`Found ${errorCount} errors`))
			process.exit(1)
		}
	}
}

main({
	fix: process.argv.includes('--fix'),
})
