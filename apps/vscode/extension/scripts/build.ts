import esbuild from 'esbuild'
import { logEnv } from './cli'
import { copyEditor, removeDistDirectory } from './helpers'

const log = logEnv('extension')

async function build() {
	await copyEditor({ log })
	await removeDistDirectory({ log })

	try {
		const entryPoints = ['./src/extension.ts']
		log({ cmd: 'esbuild', args: { entryPoints } })
		await esbuild.build({
			entryPoints,
			outdir: 'dist/web',
			minify: false,
			bundle: true,
			format: 'cjs',
			target: 'es6',
			platform: 'node',
			define: {
				'process.env.NODE_ENV': '"production"',
			},
			tsconfig: './tsconfig.json',
			external: ['vscode'],
			loader: {
				'.woff2': 'dataurl',
				'.woff': 'dataurl',
				'.svg': 'file',
				'.png': 'file',
				'.json': 'file',
			},
		})

		log({ cmd: 'esbuild:success', args: { entryPoints } })
	} catch (error) {
		log({ cmd: 'esbuild:error', args: { error } })
		throw error
	}
}
build()
