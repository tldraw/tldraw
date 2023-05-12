// @ts-nocheck
/* eslint-disable */

import browserslist from 'browserslist-to-esbuild'
import crypto from 'crypto'
import esbuild from 'esbuild'
import { createServer as createNonSslServer, request } from 'http'
import { createServer as createSslServer } from 'https'
import ip from 'ip'
import chalk from 'kleur'
import forge from 'node-forge'
import * as url from 'url'

const LOG_REQUEST_PATHS = false

export const generateCert = ({ altNameIPs, altNameURIs, validityDays }) => {
	const keys = forge.pki.rsa.generateKeyPair(2048)
	const cert = forge.pki.createCertificate()
	cert.publicKey = keys.publicKey

	// NOTE: serialNumber is the hex encoded value of an ASN.1 INTEGER.
	// Conforming CAs should ensure serialNumber is:
	// - no more than 20 octets
	// - non-negative (prefix a '00' if your value starts with a '1' bit)
	cert.serialNumber = '01' + crypto.randomBytes(19).toString('hex') // 1 octet = 8 bits = 1 byte = 2 hex chars
	cert.validity.notBefore = new Date()
	cert.validity.notAfter = new Date(
		new Date().getTime() + 1000 * 60 * 60 * 24 * (validityDays ?? 1)
	)
	const attrs = [
		{
			name: 'countryName',
			value: 'AU',
		},
		{
			shortName: 'ST',
			value: 'Some-State',
		},
		{
			name: 'organizationName',
			value: 'Temporary Testing Department Ltd',
		},
	]
	cert.setSubject(attrs)
	cert.setIssuer(attrs)

	// add alt names so that the browser won't complain
	cert.setExtensions([
		{
			name: 'subjectAltName',
			altNames: [
				...(altNameURIs !== undefined ? altNameURIs.map((uri) => ({ type: 6, value: uri })) : []),
				...(altNameIPs !== undefined ? altNameIPs.map((uri) => ({ type: 7, ip: uri })) : []),
			],
		},
	])
	// self-sign certificate
	cert.sign(keys.privateKey)

	// convert a Forge certificate and private key to PEM
	const pem = forge.pki.certificateToPem(cert)
	const privateKey = forge.pki.privateKeyToPem(keys.privateKey)

	return {
		cert: pem,
		privateKey,
	}
}

const { log } = console

const dirname = url.fileURLToPath(new URL('.', import.meta.url))

const PORT = 5420
const SSL_PORT = 5421
const ENABLE_SSL = process.env.ENABLE_SSL === '1'
const ENABLE_NETWORK_CACHING = process.env.ENABLE_NETWORK_CACHING === '1'
const OUT_DIR = dirname + '/../www/'

const clients = []

async function main() {
	await esbuild.build({
		entryPoints: ['src/index.tsx'],
		outdir: OUT_DIR,
		bundle: true,
		minify: false,
		sourcemap: true,
		incremental: true,
		format: 'cjs',
		external: ['*.woff'],
		target: browserslist(['defaults']),
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

			function forwardRequest(url) {
				const path = (url?.split('/').pop()?.indexOf('.') ?? -1) > -1 ? url : `/index.html` //for PWA with router

				if (LOG_REQUEST_PATHS) {
					console.log('[%s]=', method, path)
				}

				const req2 = request(
					{ hostname: host, port: esbuildPort, path, method, headers },
					(prxRes) => {
						const newHeaders = {
							...prxRes.headers,
						}

						if (ENABLE_NETWORK_CACHING) {
							const hrInSeconds = 60*60*60
							newHeaders['cache-control'] = `max-age=${hrInSeconds}`;
						}

						if (url === '/index.js') {
							const jsReloadCode =
								' (() => new EventSource("/esbuild").onmessage = () => location.reload())();'

							newHeaders['content-length'] = parseInt(prxRes.headers['content-length'] ?? '0', 10) + jsReloadCode.length,

							res.writeHead(prxRes.statusCode ?? 0, newHeaders)
							res.write(jsReloadCode)
						} else {
							res.writeHead(prxRes.statusCode ?? 0, newHeaders)
						}
						prxRes.pipe(res, { end: true })
					}
				)

				req.pipe(req2, { end: true })
			}

			forwardRequest(url ?? '/')
		}

		const nonSslServer = createNonSslServer(handler)
		nonSslServer.on('error', function (e) {
			// Handle your error here
			console.log(e)
		})
		nonSslServer.listen(PORT, () => {
			log(`Running on:\n`)
			log(chalk.bold().cyan(`  http://localhost:${PORT}`))
			log(`\nNetwork:\n`)
			log(chalk.bold().cyan(`  http://${ip.address()}:${PORT}`))
		})

		if (ENABLE_SSL) {
			const cert = generateCert({
				altNameIPs: ['127.0.0.1'],
				altNameURIs: ['localhost'],
				validityDays: 2,
			})
			const sslServer = createSslServer({ key: cert.privateKey, cert: cert.cert }, handler)
			sslServer.on('error', function (e) {
				// Handle your error here
				console.log(e)
			})
			sslServer.listen(SSL_PORT, () => {
				// TODO: Nasty, but gets detected by script runner
				log('[tldraw:process_ready]');

				log(`Running on:\n`)
				log(chalk.bold().cyan(`  https://localhost:${SSL_PORT}`))
				log(`\nNetwork:\n`)
				log(chalk.bold().cyan(`  https://${ip.address()}:${SSL_PORT}`))
			})
		}
	})
}

main()
