import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { exec } from './lib/exec'
import { readFileIfExists } from './lib/file'
import { nicelog } from './lib/nicelog'
import { getAllWorkspacePackages } from './lib/workspace'

const packagesOurTypesCanDependOn = [
	'@types/lodash.throttle',
	'@types/lodash.uniq',
	'@types/lodash.isequal',
	'@types/lodash.isequalwith',
	'@types/react',
	'@types/react-dom',
	'eventemitter3',
	'nanoevents',
	'react',
	'react-dom',
]

// These packages use subpath exports which require moduleResolution: "bundler".
// We pin to the workspace's resolved versions to avoid installing broken releases.
const pinnedPackages = ['@tiptap/core', '@tiptap/react', '@tiptap/pm']

function getPinnedVersions(): string[] {
	return pinnedPackages.map((pkg) => {
		const pkgJsonPath = resolve(`./node_modules/${pkg}/package.json`)
		const { version } = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
		return `${pkg}@${version}`
	})
}

main()

async function main() {
	const tsconfig: any = {
		compilerOptions: {
			lib: ['esnext', 'dom'],
			strict: true,
			module: 'esnext',
			moduleResolution: 'bundler',
			rootDir: '.',
			paths: {},
			esModuleInterop: true,
		},
		files: [],
	}

	const tempDir = (await exec('mktemp', ['-d'])).trim()
	nicelog(`Working in ${tempDir}`)

	const packages = (await getAllWorkspacePackages()).filter(
		({ packageJson }) => !packageJson.private
	)

	nicelog(
		'Checking packages:',
		packages.map(({ packageJson }) => packageJson.name)
	)

	for (const { name, relativePath } of packages) {
		const unprefixedName = name.replace('@tldraw/', '')
		const dtsFile = await readFileIfExists(join(relativePath, 'api', 'public.d.ts'))
		if (!dtsFile) {
			nicelog(`No public.d.ts for ${name}, skipping`)
			continue
		}

		writeFileSync(join(tempDir, `${unprefixedName}.d.ts`), dtsFile, 'utf8')
		tsconfig.compilerOptions.paths[name] = [`./${unprefixedName}.d.ts`]
		tsconfig.files.push(`./${unprefixedName}.d.ts`)
	}

	nicelog('Checking with tsconfig:', tsconfig)
	writeFileSync(`${tempDir}/tsconfig.json`, JSON.stringify(tsconfig, null, '\t'), 'utf8')
	writeFileSync(`${tempDir}/package.json`, JSON.stringify({ dependencies: {} }, null, '\t'), 'utf8')

	await exec('npm', ['install', ...packagesOurTypesCanDependOn, ...getPinnedVersions()], {
		pwd: tempDir,
	})
	await exec(resolve('./node_modules/.bin/tsc'), [], { pwd: tempDir })

	await exec('rm', ['-rf', tempDir])
}
