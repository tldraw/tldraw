import esbuild from 'esbuild'
import { join } from 'path'
import { logEnv } from '../../vscode-script-utils/cli'
import { copyEditor, removeDistDirectory } from '../../vscode-script-utils/helpers'
import { getDirname } from '../../vscode-script-utils/path'

const rootDir = getDirname(import.meta.url, '../')
const log = logEnv('extension')

async function dev() {
	await copyEditor({ log })
	await removeDistDirectory({ log })
	const entryPoints = [join(rootDir, 'src', 'extension.ts')]

	log({ cmd: 'esbuild', args: { entryPoints } })
	try {
		esbuild.build({
			entryPoints,
			outdir: join(rootDir, 'dist', 'web'),
			minify: false,
			bundle: true,
			format: 'cjs',
			target: 'es6',
			sourcemap: 'inline',
			platform: 'node',
			define: {
				'process.env.NODE_ENV': '"development"',
			},
			tsconfig: './tsconfig.json',
			external: ['vscode'],
			incremental: true,
			watch: {
				onRebuild(err) {
					if (err) {
						log({ cmd: 'esbuild:error', args: { error: err } })
					} else {
						log({ cmd: 'esbuild:success', args: {} })
					}
				},
			},
			loader: {
				'.woff2': 'dataurl',
				'.woff': 'dataurl',
				'.svg': 'file',
				'.png': 'file',
				'.json': 'file',
			},
		})
	} catch (error) {
		log({ cmd: 'esbuild:error', args: { error } })
		throw error
	}
}
dev()
