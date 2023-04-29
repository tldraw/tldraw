// @ts-nocheck
/* eslint-disable */

import browserslist from 'browserslist-to-esbuild'
import esbuild from 'esbuild'
import { createServer, request } from 'http'
import ip from 'ip'
import chalk from 'kleur'
import * as url from 'url'
import fs from 'fs'

const LOG_REQUEST_PATHS = false

const { log } = console

const dirname = url.fileURLToPath(new URL('.', import.meta.url))

const PORT = 5420
const SSL_PORT = 5421
const OUT_DIR = dirname + '/../www/'

/** @type {{ write(data: any): any }[]} */
const clients = []

async function main() {
	const isAnalyzeEnabled = process.env.ANALYZE === 'true'

	const result = await esbuild.build({
		entryPoints: ['src/index.tsx'],
		outdir: OUT_DIR,
		bundle: true,
		minify: false,
		sourcemap: true,
		incremental: true,
		format: 'cjs',
		external: ['*.woff'],
		target: browserslist(['defaults']),
		metafile: isAnalyzeEnabled,
		define: {
			process: '{ "env": { "NODE_ENV": "development"} }',
		},
		loader: {
			'.woff2': 'file',
			'.svg': 'file',
			'.json': 'file',
			'.png': 'file',
		},
		watch: {
			onRebuild(error) {
				log('rebuilt')
				if (error) {
					log(error)
				}
				clients.forEach((res) => res.write('data: update\n\n'))
				clients.length = 0
			},
		},
	})

	if (isAnalyzeEnabled) {
		await fs.promises.writeFile('build.esbuild.json', JSON.stringify(result.metafile));	
		console.log(await esbuild.analyzeMetafile(result.metafile, {
			verbose: true,
		}))
	}

	esbuild.serve({ servedir: OUT_DIR, port: 8009 }, {}).then(({ host, port: esbuildPort }) => {
		const handler = async (req, res) => {
			const { url, method, headers } = req
			if (req.url === '/esbuild')
				return clients.push(
					res.writeHead(200, {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
					})
				)

			/** @param {string} url */
			function forwardRequest(url) {
				const path = (url?.split('/').pop()?.indexOf('.') ?? -1) > -1 ? url : `/index.html` //for PWA with router

				if (LOG_REQUEST_PATHS) {
					console.log('[%s]=', method, path)
				}

				const req2 = request(
					{ hostname: host, port: esbuildPort, path, method, headers },
					(prxRes) => {
						if (url === '/index.js') {
							const jsReloadCode =
								' (() => new EventSource("/esbuild").onmessage = () => location.reload())();'

							const newHeaders = {
								...prxRes.headers,
								'content-length':
									parseInt(prxRes.headers['content-length'] ?? '0', 10) + jsReloadCode.length,
							}

							res.writeHead(prxRes.statusCode ?? 0, newHeaders)
							res.write(jsReloadCode)
						} else {
							res.writeHead(prxRes.statusCode ?? 0, prxRes.headers)
						}
						prxRes.pipe(res, { end: true })
					}
				)

				req.pipe(req2, { end: true })
			}

			forwardRequest(url ?? '/')
		}

		const server = createServer(handler)
		server.on('error', function (e) {
			// Handle your error here
			console.log(e)
		})
		server.listen(PORT, () => {
			log(`Running on:\n`)
			log(chalk.bold().cyan(`  http://localhost:${PORT}`))
			log(`\nNetwork:\n`)
			log(chalk.bold().cyan(`  http://${ip.address()}:${PORT}`))
		})
	})
}

main()
