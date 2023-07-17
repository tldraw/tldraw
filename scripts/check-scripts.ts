import kleur from 'kleur'
import path from 'path'
import { REPO_ROOT, writeJsonFile } from './lib/file'
import { nicelog } from './lib/nicelog'
import { getAllWorkspacePackages } from './lib/workspace'

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
	test: () => 'lazy inherit',
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
		test: () => undefined,
		build: () => undefined,
		'build-api': () => undefined,
		prepack: () => undefined,
		postpack: () => undefined,
	},
}

async function main({ fix }: { fix?: boolean }) {
	const packages = await getAllWorkspacePackages()
	const needsFix = new Set()

	let errorCount = 0
	for (const { path: packageDir, relativePath, packageJson, name } of packages) {
		if (!packageJson.scripts) {
			packageJson.scripts = {}
		}
		const packageScripts = packageJson.scripts

		let expected =
			name.startsWith('@tldraw/') &&
			(relativePath.startsWith('bublic/packages/') || relativePath.startsWith('packages/'))
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
