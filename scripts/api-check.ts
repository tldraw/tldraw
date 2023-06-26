import { writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { exec } from './lib/exec'
import { readFileIfExists } from './lib/file'
import { nicelog } from './lib/nicelog'
import { getAllWorkspacePackages } from './lib/workspace'

const packagesOurTypesCanDependOn = [
	'@types/react',
	'@types/react-dom',
	'eventemitter3',
	// todo: external types shouldn't depend on this
	'@types/ws',
]

main()

async function main() {
	const tsconfig: any = {
		compilerOptions: {
			lib: ['es2015', 'dom'],
			strict: true,
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

	await exec('npm', ['install', ...packagesOurTypesCanDependOn], { pwd: tempDir })
	await exec(resolve('./node_modules/.bin/tsc'), [], { pwd: tempDir })

	await exec('rm', ['-rf', tempDir])
}
