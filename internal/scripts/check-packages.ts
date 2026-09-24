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
import { Package, getAllWorkspacePackages, getRootPackage } from './lib/workspace'

const packagesWithoutTSConfigs: ReadonlySet<string> = new Set(['config'])

// all packages should have these scripts
const expectedPackageJsonScriptsForAll = {
	lint: tsScript('lint.ts'),
}

const expectedTestScripts = {
	test: () => 'pnpm exec vitest --passWithNoTests',
	'test-ci': () => 'pnpm exec vitest run --passWithNoTests',
	'test-coverage': () => 'pnpm exec vitest run --coverage --passWithNoTests',
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
	'pack-tarball': () => 'pnpm pack',
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
		prepack: () => 'pnpm build',
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
						kleur.blue(`$ pnpm ${scriptName}`),
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
						kleur.blue(`$ pnpm ${scriptName}`),
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
		nicelog('Run `pnpm check-packages --fix` to fix these problems')
		return false
	}

	return true
}

function scriptPath(packageDir: string, scriptName: string) {
	return path.relative(packageDir, path.join(__dirname, scriptName))
}

function tsScript(scriptName: string) {
	return (packageDir: string) => `pnpm exec tsx ${scriptPath(packageDir, scriptName)}`
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
					error(name, 'is missing LICENSE.md (run `pnpm check-packages --fix`)')
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

// Every workspace uses the same version range for a dependency, so the lockfile resolves one
// copy. To let a dependency diverge, list the workspaces that step off the shared range here:
// they must agree with each other, and everything else must agree with everything else.
const ALLOWED_VERSION_DIVERGENCE: Record<string, { workspaces: string[]; reason: string }> = {
	typescript: {
		workspaces: ['templates/'],
		reason: 'templates are independently published starters',
	},
	// TODO: drop these once the rest of the repo is bumped to match (#10903).
	next: {
		workspaces: ['templates/chat'],
		reason: '@opennextjs/cloudflare needs next >=16.3.3',
	},
	wrangler: {
		workspaces: ['templates/chat'],
		reason: '@opennextjs/cloudflare needs wrangler ^4.125.0',
	},
}

// Node 22.12 is the first version where `require()` of an ES module works unflagged, so
// published packages can depend on ESM-only modules without breaking CommonJS consumers.
// Earlier versions throw `ERR_REQUIRE_ESM`.
const PUBLISHED_NODE_ENGINE = '>=22.12.0'

const DEPENDENCY_FIELDS = [
	'dependencies',
	'devDependencies',
	'optionalDependencies',
	'peerDependencies',
] as const
type DependencyField = (typeof DEPENDENCY_FIELDS)[number]

async function checkDependencyVersions({
	packages,
	fix,
}: {
	packages: Package[]
	fix: boolean
}): Promise<boolean> {
	let errorCount = 0
	const changed = new Set<Package>()
	const report = (name: string, message: string) => {
		errorCount++
		nicelog([fix ? '⚠️ ' : '❌ ', (fix ? kleur.yellow : kleur.red)(`${name}: `), message].join(''))
	}

	const root = await getRootPackage()

	// Peer ranges are deliberately wider than installed ranges, so they're only compared with
	// each other.
	const usages = new Map<string, { pkg: Package; field: DependencyField; range: string }[]>()
	for (const pkg of [root, ...packages]) {
		for (const field of DEPENDENCY_FIELDS) {
			for (const [dep, range] of Object.entries(pkg.packageJson[field] ?? {})) {
				const diverges = ALLOWED_VERSION_DIVERGENCE[dep]?.workspaces.some((prefix) =>
					pkg.relativePath.startsWith(prefix)
				)
				const kind = field === 'peerDependencies' ? 'peer' : 'installed'
				const key = `${dep}\0${kind}\0${diverges ? 'diverged' : 'shared'}`
				if (!usages.has(key)) usages.set(key, [])
				usages.get(key)!.push({ pkg, field, range })
			}
		}
	}

	for (const [key, group] of usages) {
		const counts = new Map<string, number>()
		for (const { range } of group) counts.set(range, (counts.get(range) ?? 0) + 1)
		if (counts.size === 1) continue

		const dep = key.split('\0')[0]
		const [expected] = [...counts].sort((a, b) => b[1] - a[1])[0]
		for (const { pkg, field, range } of group) {
			if (range === expected) continue
			report(pkg.name, `${field}.${dep} is ${range}, but other workspaces use ${expected}`)
			if (fix) {
				pkg.packageJson[field]![dep] = expected
				changed.add(pkg)
			}
		}
	}

	for (const pkg of packages) {
		if ('packageManager' in pkg.packageJson) {
			report(pkg.name, 'only the root package.json may set packageManager')
			if (fix) {
				delete pkg.packageJson.packageManager
				changed.add(pkg)
			}
		}

		if (!pkg.relativePath.startsWith('packages/')) continue
		const engines = pkg.packageJson.engines ?? {}
		if (engines.node !== PUBLISHED_NODE_ENGINE) {
			report(pkg.name, `engines.node must be ${PUBLISHED_NODE_ENGINE}`)
			if (fix) {
				pkg.packageJson.engines = { ...engines, node: PUBLISHED_NODE_ENGINE }
				changed.add(pkg)
			}
		}
	}

	for (const pkg of changed) {
		await writeJsonFile(join(pkg.path, 'package.json'), pkg.packageJson)
	}

	if (errorCount) {
		nicelog(
			fix
				? kleur.yellow(`Fixed ${errorCount} errors. Run \`pnpm\` to update the lockfile.`)
				: kleur.red(`Found ${errorCount} errors. Run \`pnpm check-packages --fix\` to fix them.`)
		)
		return fix
	}

	nicelog('  ✅ dependency versions ok')
	return true
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

	const dependencyVersionsOk = await group('Checking dependency versions...', () =>
		checkDependencyVersions({ packages, fix })
	)

	if (!scriptsOk || !tsConfigsOk || !libsOk || !productMetadataOk || !dependencyVersionsOk) {
		process.exit(1)
	}
}

main({
	fix: process.argv.includes('--fix'),
})
