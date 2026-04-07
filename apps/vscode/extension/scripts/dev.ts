import { join } from 'path'
import esbuild from 'esbuild'
import { logEnv } from './cli'
import { copyEditor, removeDistDirectory } from './helpers'
import { getDirname } from './path'

const rootDir = getDirname(import.meta.url, '../')
const log = logEnv('extension')

async function dev() {
	await copyEditor({ log })
	await removeDistDirectory({ log })
	const entryPoints = [join(rootDir, 'src', 'extension.ts')]

	log({ cmd: 'esbuild', args: { entryPoints } })
	try {
		const builder = await esbuild.context({
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
			plugins: [
				{
					// hotkeys-js uses `module.exports = hotkeys` which clobbers the
					// bundle's CJS exports, breaking the extension's activate export.
					// Since it's only used by the tldraw UI (which runs in the webview,
					// not the extension host), we replace it with an empty module.
					name: 'exclude-hotkeys',
					setup(build) {
						build.onResolve({ filter: /^hotkeys-js$/ }, () => ({
							path: 'hotkeys-js',
							namespace: 'exclude',
						}))
						build.onLoad({ filter: /.*/, namespace: 'exclude' }, () => ({
							contents:
								'module.exports = function hotkeys() {}; module.exports.default = module.exports;',
							loader: 'js',
						}))
					},
				},
				{
					name: 'log-builds',
					setup(build) {
						build.onEnd((result) => {
							if (result.errors.length) {
								log({ cmd: 'esbuild:error', args: { err: result.errors } })
							} else {
								copyEditor({ log })
								log({ cmd: 'esbuild:success', args: {} })
							}
						})
					},
				},
			],
			loader: {
				'.woff2': 'dataurl',
				'.woff': 'dataurl',
				'.svg': 'file',
				'.png': 'file',
				'.json': 'file',
			},
		})
		await builder.watch()
	} catch (error) {
		log({ cmd: 'esbuild:error', args: { error } })
		throw error
	}
}
dev()
