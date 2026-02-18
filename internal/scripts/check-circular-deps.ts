import { execFile } from 'child_process'
import { access, readdir } from 'fs/promises'
import path from 'path'
import { REPO_ROOT } from './lib/file'
import { nicelog } from './lib/nicelog'

const packageEntry = 'src/index.ts'

async function exists(filePath: string) {
	try {
		await access(filePath)
		return true
	} catch {
		return false
	}
}

async function getPackageEntries() {
	const packagesDir = path.join(REPO_ROOT, 'packages')
	const packageNames = (await readdir(packagesDir)).sort()
	const entries: Record<string, string> = {}

	for (const packageName of packageNames) {
		const entryPath = path.join(packagesDir, packageName, packageEntry)
		if (await exists(entryPath)) {
			entries[packageName] = entryPath
		}
	}

	return entries
}

function checkPackageForCircularDependencies(packageName: string, packageEntryPath: string) {
	const includePatternSets =
		packageName === 'tldraw'
			? getTldrawIncludePatternSets()
			: [[`**/packages/${packageName}/**/*.{js,jsx,ts,tsx}`]]
	const ignoredCycleSignatures =
		packageName === 'tldraw'
			? [
					'packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts -> packages/tldraw/src/lib/shapes/arrow/shared.ts',
					'packages/tldraw/src/lib/shapes/arrow/elbow/getElbowArrowInfo.tsx -> packages/tldraw/src/lib/shapes/arrow/shared.ts',
				]
			: []

	const script = `
		import { build } from 'vite'
		import circularDependencyChecker from 'vite-plugin-circular-dependency'
		import { mkdirSync, readFileSync, rmSync } from 'fs'
		import path from 'path'

		const packageName = process.argv[1]
		const packageEntryPath = process.argv[2]
		const includePatternSets = JSON.parse(process.argv[3])
		const ignoredCycleSignatures = new Set(JSON.parse(process.argv[4]))

		for (const includePatterns of includePatternSets) {
			const outputFilePath = path.join(
				'.lazy',
				'circle-deps',
				packageName + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.json'
			)
			mkdirSync(path.dirname(outputFilePath), { recursive: true })

			await build({
				root: ${JSON.stringify(REPO_ROOT)},
				logLevel: 'error',
				plugins: [
					circularDependencyChecker({
						circleImportThrowErr: false,
						outputFilePath,
						include: includePatterns,
					}),
				],
				build: {
					write: false,
					emptyOutDir: false,
					minify: false,
					target: 'es2022',
					rollupOptions: {
						input: {
							[packageName]: packageEntryPath,
						},
						onwarn(warning, warn) {
							if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
							warn(warning)
						},
					},
				},
			})

			let cycleReport = {}
			try {
				cycleReport = JSON.parse(readFileSync(outputFilePath, 'utf8'))
			} finally {
				rmSync(outputFilePath, { force: true })
			}

			const cycleSignatures = Object.values(cycleReport)
				.flat()
				.map((chain) => chain.join(' -> '))
				.filter((signature) => !ignoredCycleSignatures.has(signature))

			if (cycleSignatures.length > 0) {
				console.error(
					'Found circular dependencies:\\n' +
						cycleSignatures.map((signature) => '  ' + signature).join('\\n')
				)
				process.exit(1)
			}
		}
	`

	return new Promise<void>((resolve, reject) => {
		const child = execFile(
			'node',
			[
				'--input-type=module',
				'-e',
				script,
				packageName,
				packageEntryPath,
				JSON.stringify(includePatternSets),
				JSON.stringify(ignoredCycleSignatures),
			],
			{ cwd: REPO_ROOT },
			(error) => {
				if (error) reject(error)
				else resolve()
			}
		)

		child.stdout?.on('data', (chunk) => process.stdout.write(chunk))
		child.stderr?.on('data', (chunk) => process.stderr.write(chunk))
	})
}

function getTldrawIncludePatternSets() {
	const indexPattern = '**/packages/tldraw/src/index.ts'
	const libScopePatterns = [
		'bindings',
		'canvas',
		'defaultBindingUtils.ts',
		'defaultEmbedDefinitions.ts',
		'defaultExternalContentHandlers.ts',
		'defaultShapeTools.ts',
		'defaultShapeUtils.ts',
		'defaultSideEffects.ts',
		'defaultTools.ts',
		'shapes',
		'styles.tsx',
		'tools',
		'Tldraw.tsx',
		'TldrawImage.tsx',
		'utils',
	].map((scope) =>
		scope.endsWith('.ts') || scope.endsWith('.tsx')
			? `**/packages/tldraw/src/lib/${scope}`
			: `**/packages/tldraw/src/lib/${scope}/**/*.{js,jsx,ts,tsx}`
	)

	const uiScopePatterns = [
		'TldrawUi.tsx',
		'assetUrls.ts',
		'components',
		'constants.ts',
		'context',
		'getLocalFiles.ts',
		'hooks',
		'icon-types.ts',
		'kbd-utils.ts',
		'overrides.ts',
		'version.ts',
	].map((scope) =>
		scope.endsWith('.ts') || scope.endsWith('.tsx')
			? `**/packages/tldraw/src/lib/ui/${scope}`
			: `**/packages/tldraw/src/lib/ui/${scope}/**/*.{js,jsx,ts,tsx}`
	)

	return [...libScopePatterns, ...uiScopePatterns].map((scopePattern) => [
		indexPattern,
		scopePattern,
	])
}

async function main() {
	const entries = await getPackageEntries()
	const packageNames = Object.keys(entries)
	nicelog(`Checking for circular dependencies in packages (${packageNames.length}):`)
	nicelog(packageNames.join(', '))

	const failedPackages: string[] = []

	for (const packageName of packageNames) {
		const packageEntryPath = entries[packageName]
		nicelog(`Checking ${packageName}...`)
		try {
			await checkPackageForCircularDependencies(packageName, packageEntryPath)
		} catch {
			failedPackages.push(packageName)
		}
	}

	if (failedPackages.length > 0) {
		console.error(
			`Circular dependency checks failed for ${failedPackages.length} package(s): ${failedPackages.join(', ')}`
		)
		process.exit(1)
	}

	nicelog(`No circular dependencies detected across ${packageNames.length} packages.`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
