import { execSync } from 'child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import glob from 'glob'
import { nicelog } from './lib/nicelog'

/** Prepares the package for publishing. the tarball in case it will be written to disk. */
export async function preparePackage({ sourcePackageDir }: { sourcePackageDir: string }) {
	if (!existsSync(path.join(sourcePackageDir, 'src/index.ts'))) {
		throw new Error(`No src/index.ts file found in '${sourcePackageDir}'!`)
	}

	const manifest = JSON.parse(readFileSync(path.join(sourcePackageDir, 'package.json'), 'utf8'))
	const packageName = manifest.name ?? path.basename(sourcePackageDir)
	const startTime = Date.now()
	nicelog(`[prepack] ${packageName} starting...`)

	execSync('yarn run -T lazy build', { cwd: sourcePackageDir, stdio: 'inherit' })

	// save package.json and reinstate it in postpack
	copyFileSync(
		path.join(sourcePackageDir, 'package.json'),
		path.join(sourcePackageDir, 'package.json.bak')
	)

	const cssFiles = glob.sync(path.join(sourcePackageDir, '*.css'))

	// construct the final package.json
	// eslint-disable-next-line no-restricted-globals
	const newManifest = structuredClone({
		// filter out comments
		...Object.fromEntries(
			Object.entries(manifest).filter(([key]) => !key.startsWith('/*') && key !== 'types')
		),
		main: 'dist-cjs/index.js',
		module: 'dist-esm/index.mjs',
		source: 'src/index.ts',
		exports: {
			'.': {
				import: './dist-esm/index.mjs',
				require: './dist-cjs/index.js',
			},
			...Object.fromEntries(
				cssFiles.map((file) => [`./${path.basename(file)}`, `./${path.basename(file)}`])
			),
		},
		files: [...(manifest.files ?? []), 'dist-esm', 'dist-cjs', 'src'],
		type: undefined,
	})
	writeFileSync(
		path.join(sourcePackageDir, 'package.json'),
		JSON.stringify(newManifest, null, `\t`)
	)

	// GOTCHA: Yarn's pack command seems to have a race condition where it doesn't reliably pick up
	// files, adding a tiny delay seems to fix it, but we make the delay extra long here just to be
	// safe.
	await new Promise((resolve) => setTimeout(resolve, 1000))

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
	nicelog(`[prepack] ${packageName} done (${elapsed}s)`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	// module was called directly
	;(async () => {
		await preparePackage({
			sourcePackageDir: path.resolve(path.normalize(process.argv[2] ?? process.cwd())),
		})
	})()
}
