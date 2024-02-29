import kleur from 'kleur'
import { join, relative } from 'path'
import { readJsonIfExists, writeJsonFile } from './lib/file'
import { nicelog } from './lib/nicelog'
import { Package, getAllWorkspacePackages } from './lib/workspace'

const packagesWithoutTSConfigs: ReadonlySet<string> = new Set(['config'])

async function checkTsConfigs({ packages, fix }: { fix?: boolean; packages: Package[] }) {
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
				writeJsonFile(tsconfigPath, tsconfig)
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
				writeJsonFile(tsconfigPath, tsconfig)
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
	}
	if (numErrors > 0) {
		nicelog('Run `yarn check-tsconfigs --fix` to fix these problems')
		process.exit(1)
	}
}

async function main({ fix }: { fix?: boolean }) {
	const packages = await getAllWorkspacePackages()

	await checkTsConfigs({ packages, fix })
}

main({
	fix: process.argv.includes('--fix'),
})
