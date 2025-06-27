import { Edit, Lang, parseAsync } from '@ast-grep/napi'
import esbuild from 'esbuild'
import fs from 'fs'
import glob from 'glob'
import os from 'os'
import path, { dirname } from 'path'

export function inlineWorkerPlugin(extraConfig: esbuild.BuildOptions = {}) {
	return {
		name: 'esbuild-plugin-inline-worker',

		setup(build: esbuild.PluginBuild) {
			build.onLoad({ filter: /.*/ }, async (args) => {
				const code = await fs.promises.readFile(args.path, 'utf8')

				try {
					const fileinfo = (() => {
						const ext = path.extname(args.path)
						switch (ext) {
							case '.ts':
							case '.mts':
							case '.cts':
								return {
									lang: Lang.TypeScript,
									loader: 'ts' as const,
								}
							case '.tsx':
							case '.mtsx':
							case '.ctsx':
								return {
									lang: Lang.Tsx,
									loader: 'tsx' as const,
								}
							case '.js':
							case '.mjs':
							case '.cjs':
								return {
									lang: Lang.JavaScript,
									loader: 'js' as const,
								}
							default:
								return null
						}
					})()
					if (!fileinfo) {
						return null
					}

					const ast = await parseAsync(fileinfo.lang, code)
					const root = ast.root()
					const foundNodes = root.findAll('new Worker(new URL($IMPORT, import.meta.url))')

					const edits = await Promise.all(
						foundNodes.map(async (node) => {
							const filepath = node.getMatch('IMPORT')?.child(1)?.text()

							if (!filepath) {
								return null
							}

							const potentialWorkPath = path.resolve(dirname(args.path), filepath)
							const [workerFile] = glob.sync(`${potentialWorkPath}*`)

							if (!workerFile) {
								return null
							}

							const workerCode = await buildWorker(workerFile, extraConfig)

							return node.replace(`(() => {
  const blob = new Blob([${JSON.stringify(workerCode)}], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
})()`)
						})
					).then((edits) => edits.filter((edit) => !!edit).toReversed() as Edit[])

					if (!edits.length) {
						return null
					}

					const contents = root.commitEdits(edits)

					return {
						contents,
						loader: fileinfo.loader,
					}
				} catch {
					return null
				}
			})
		},
	}
}

function findCacheDir({ name, create }: { name: string; create?: boolean }) {
	const cacheDir = path.join(os.tmpdir(), name)
	if (create && !fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true })
	}
	return cacheDir
}

let cacheDir = findCacheDir({
	name: 'esbuild-plugin-inline-worker',
	create: true,
})

async function buildWorker(workerPath: string, extraConfig: esbuild.BuildOptions) {
	let scriptNameParts = path.basename(workerPath).split('.')
	scriptNameParts.pop()
	scriptNameParts.push('js')
	let scriptName = scriptNameParts.join('.')
	let bundlePath = path.resolve(cacheDir, scriptName)

	if (extraConfig) {
		delete extraConfig.entryPoints
		delete extraConfig.outfile
		delete extraConfig.outdir
	}

	await esbuild.build({
		entryPoints: [workerPath],
		bundle: true,
		minify: false,
		outfile: bundlePath,
		target: 'es2017',
		format: 'esm',
		...extraConfig,
	})

	return fs.promises.readFile(bundlePath, { encoding: 'utf-8' })
}
