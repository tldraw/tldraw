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

async function getIncludePatternSets(packageName: string) {
	const fullPackagePatternSet = [[`**/packages/${packageName}/**/*.{js,jsx,ts,tsx}`]]
	if (packageName !== 'tldraw') return fullPackagePatternSet

	const tldrawLibDir = path.join(REPO_ROOT, 'packages', 'tldraw', 'src', 'lib')
	const tldrawEntries = (await readdir(tldrawLibDir, { withFileTypes: true })).sort((a, b) =>
		a.name.localeCompare(b.name)
	)

	const perScopePatterns: string[] = []
	for (const entry of tldrawEntries) {
		if (!entry.isDirectory()) {
			perScopePatterns.push(`**/packages/tldraw/src/lib/${entry.name}`)
			continue
		}

		if (entry.name !== 'ui') {
			perScopePatterns.push(`**/packages/tldraw/src/lib/${entry.name}/**/*.{js,jsx,ts,tsx}`)
			continue
		}

		// Split ui into child scopes to avoid plugin crashes on large combined graphs.
		const tldrawUiDir = path.join(tldrawLibDir, 'ui')
		const tldrawUiEntries = (await readdir(tldrawUiDir, { withFileTypes: true })).sort((a, b) =>
			a.name.localeCompare(b.name)
		)
		for (const uiEntry of tldrawUiEntries) {
			perScopePatterns.push(
				uiEntry.isDirectory()
					? `**/packages/tldraw/src/lib/ui/${uiEntry.name}/**/*.{js,jsx,ts,tsx}`
					: `**/packages/tldraw/src/lib/ui/${uiEntry.name}`
			)
		}
	}

	return perScopePatterns.map((scopePattern) => ['**/packages/tldraw/src/index.ts', scopePattern])
}

async function checkPackageForCircularDependencies(packageName: string, packageEntryPath: string) {
	const includePatternSets = await getIncludePatternSets(packageName)

	const script = `
		import { build } from 'vite'
		import circularDependencyChecker from 'vite-plugin-circular-dependency'
		import { mkdirSync, readFileSync, rmSync } from 'fs'
		import path from 'path'

		const packageName = process.argv[1]
		const packageEntryPath = process.argv[2]
		const includePatternSets = JSON.parse(process.argv[3])

		for (const includePatterns of includePatternSets) {
			const outputFilePath = path.join(
				'.lazy',
				'circle-deps',
				packageName + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.json'
			)
			mkdirSync(path.dirname(outputFilePath), { recursive: true })

			let cycleReport = {}
			try {
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
				cycleReport = JSON.parse(readFileSync(outputFilePath, 'utf8'))
			} finally {
				rmSync(outputFilePath, { force: true })
			}

			const cycleSignatures = Object.values(cycleReport)
				.flat()
				.map((chain) => chain.join(' -> '))

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
