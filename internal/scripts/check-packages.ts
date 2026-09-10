import { existsSync } from 'fs'
import path, { join, relative } from 'path'
import kleur from 'kleur'
import {
	REPO_ROOT,
	readFileIfExists,
	readJsonIfExists,
	writeCodeFile,
	writeJsonFile,
	writeStringFile,
} from './lib/file'
import { nicelog } from './lib/nicelog'
import { PRODUCT_CONFIG_KEY } from './lib/types'
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
		lint: () => undefined,
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

const LICENSE_POINTER_CONTENTS =
	'This code is licensed under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md)\n'

// The stable id convention is documented in internal/docs/product-stable-ids.md. Every published
// package in packages/ must declare which commercial component it belongs to, and premium
// components must name the license key flag that entitles them.
async function checkProductMetadata({
	packages,
	fix,
}: {
	packages: Package[]
	fix: boolean
}): Promise<boolean> {
	let errorCount = 0
	const error = (name: string, message: string) => {
		errorCount++
		nicelog(['❌ ', kleur.red(`${name}: `), message].join(''))
	}

	const licenseManagerSource = await readFileIfExists(
		join(REPO_ROOT, 'packages/editor/src/lib/license/LicenseManager.ts')
	)
	if (!licenseManagerSource) {
		throw new Error('Could not read LicenseManager.ts to validate license flags')
	}
	const knownLicenseFlags = new Set(
		[...licenseManagerSource.matchAll(/^\t(FEAT_[A-Z0-9_]+):/gm)].map((m) => m[1])
	)

	const byStableId = new Map<string, { name: string; config: string }[]>()

	for (const { packageJson, name, relativePath, path: packageDir } of packages) {
		if (!relativePath.startsWith('packages/') || packageJson.private) continue

		// published packages that point at LICENSE.md must actually ship one, since npm only
		// includes license files that exist inside the package directory
		if (packageJson.license === 'SEE LICENSE IN LICENSE.md') {
			const licensePath = join(packageDir, 'LICENSE.md')
			if (!existsSync(licensePath)) {
				if (fix) {
					await writeStringFile(licensePath, LICENSE_POINTER_CONTENTS)
					nicelog(['⚠️ ', kleur.yellow(`${name}: `), 'added missing LICENSE.md'].join(''))
				} else {
					error(name, 'is missing LICENSE.md (run `yarn check-packages --fix`)')
				}
			}
		}

		const product = packageJson[PRODUCT_CONFIG_KEY]
		if (!product) {
			error(
				name,
				`is missing the "${PRODUCT_CONFIG_KEY}" field in package.json. ` +
					'See internal/docs/product-stable-ids.md for how to choose a stable id.'
			)
			continue
		}

		if (!/^tldraw:[a-z0-9-]+$/.test(product.stableId)) {
			error(name, `has invalid stableId "${product.stableId}" (expected tldraw:<kebab-case>)`)
		}
		if (product.premium && !product.licenseFlag) {
			error(name, 'is premium but has no licenseFlag')
		}
		if (!product.premium && product.licenseFlag) {
			error(name, 'has a licenseFlag but is not premium')
		}
		if (product.licenseFlag && !knownLicenseFlags.has(product.licenseFlag)) {
			error(
				name,
				`has licenseFlag "${product.licenseFlag}" which does not exist in LicenseManager FLAGS`
			)
		}

		if (product.type === 'feature' && !product.parent) {
			error(name, 'is a feature but has no parent component')
		}
		if (product.type === 'product' && product.parent) {
			error(name, 'is a top-level product but declares a parent')
		}
		if (product.parent === product.stableId) {
			error(name, 'is its own parent')
		}

		// all packages sharing a stable id must agree on the rest of the metadata, since they
		// describe the same commercial component
		const configKey = JSON.stringify([
			product.name,
			product.type,
			product.parent ?? null,
			product.premium,
			product.licenseFlag ?? null,
		])
		const others = byStableId.get(product.stableId) ?? []
		others.push({ name, config: configKey })
		byStableId.set(product.stableId, others)
	}

	for (const [stableId, entries] of byStableId) {
		if (new Set(entries.map((e) => e.config)).size > 1) {
			error(
				stableId,
				`packages disagree on product metadata: ${entries.map((e) => e.name).join(', ')}`
			)
		}
	}

	// every parent must be a component that actually exists, or the order form would reference a
	// line item nothing defines
	for (const { packageJson, name, relativePath } of packages) {
		if (!relativePath.startsWith('packages/') || packageJson.private) continue
		const parent = packageJson[PRODUCT_CONFIG_KEY]?.parent
		if (parent && !byStableId.has(parent)) {
			error(name, `has parent "${parent}" which is not a known component`)
		}
	}

	if (errorCount) {
		nicelog(kleur.red(`Found ${errorCount} errors`))
		return false
	}

	nicelog(['✅ ', kleur.green('product metadata ok')].join(''))
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
	const productMetadataOk = await group('Checking product metadata...', () =>
		checkProductMetadata({ packages, fix })
	)

	if (!scriptsOk || !tsConfigsOk || !libsOk || !productMetadataOk) {
		process.exit(1)
	}
}

main({
	fix: process.argv.includes('--fix'),
})
