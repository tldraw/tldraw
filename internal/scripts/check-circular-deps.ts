import { access, readdir } from 'fs/promises'
import path from 'path'
import { build } from 'vite'
import circularDependencyChecker from 'vite-plugin-circular-dependency'
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

async function main() {
	const entries = await getPackageEntries()
	const packageNames = Object.keys(entries)
	nicelog(`Checking for circular dependencies in packages (${packageNames.length}):`)
	nicelog(packageNames.join(', '))

	await build({
		root: REPO_ROOT,
		logLevel: 'error',
		plugins: [
			circularDependencyChecker({
				circleImportThrowErr: true,
				include: [/[\\/]packages[\\/].*\.[jt]sx?$/],
			}),
		],
		build: {
			write: false,
			emptyOutDir: false,
			minify: false,
			target: 'es2022',
			rollupOptions: {
				input: entries,
				onwarn(warning, warn) {
					if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
					warn(warning)
				},
			},
		},
	})

	nicelog(`No circular dependencies detected across ${packageNames.length} packages.`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
