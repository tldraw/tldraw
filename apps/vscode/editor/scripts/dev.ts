import dotenv from 'dotenv'
import esbuild from 'esbuild'
import fs from 'fs'
import fse, { exists } from 'fs-extra'
import path from 'path'
import { logEnv } from './cli'
import { copyEditor } from './helpers'
import { getDirname } from './path'

dotenv.config()
const rootDir = getDirname(import.meta.url, '../')
const log = logEnv('editor')

export async function run() {
	try {
		const targetFolder = `${rootDir}dist/`
		if (await exists(targetFolder)) {
			log({ cmd: 'remove', args: { target: targetFolder } })
			await fs.promises.rm(targetFolder, { recursive: true })
		}

		await fs.promises.mkdir(targetFolder)

		const topSource = `${rootDir}public`
		const files = await fs.promises.readdir(topSource)
		for (const file of files) {
			const dest = targetFolder + path.basename(file)
			const source = path.join(topSource, file)
			log({ cmd: 'copy', args: { source, dest } })
			await fse.copy(source, dest)
		}
		const entryPoints = [`${rootDir}src/index.tsx`]

		log({ cmd: 'esbuild', args: { entryPoints } })

		const builder = await esbuild.context({
			entryPoints,
			outfile: `${rootDir}/dist/index.js`,
			minify: false,
			bundle: true,
			target: 'es6',
			jsxFactory: 'React.createElement',
			jsxFragment: 'React.Fragment',
			loader: {
				'.woff2': 'dataurl',
				'.woff': 'dataurl',
				'.svg': 'file',
				'.png': 'file',
				'.json': 'file',
			},
			define: {
				'process.env.NODE_ENV': '"development"',
			},
			plugins: [
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
		})
		await builder.watch()
	} catch (error) {
		log({ cmd: 'esbuild:error', args: { error } })
		throw error
	}
}

run()
