import { existsSync, readFileSync, rmSync } from 'fs'
import kleur from 'kleur'
import minimist from 'minimist'
import { resolve } from 'path'
import { exec } from './lib/exec'

const args = minimist(process.argv.slice(2))
const sizeLimit = Number(args['size-limit-bytes'])
if (!isFinite(sizeLimit) || sizeLimit < 1) {
	console.error(
		'Invalid usage. Usage: yarn tsx check-worker-bundle.ts --size-limit-bytes <size> --entry <entry>'
	)
	process.exit(1)
}

const entry = args['entry']
if (!existsSync(entry)) {
	console.error('Entry file does not exist:', entry)
	process.exit(1)
}

const bundleMetaFileName = '.bundle-meta.json'

interface Meta {
	outputs: {
		[fileName: string]: {
			bytes: number
		}
	}
}

const EXTERNAL_DEPS = [
	'cloudflare:*',
	'crypto',
	'tls',
	'net',
	'stream',
	'fs',
	'os',
	'perf_hooks',
	'path',
	'dns',
	'node:child_process',
	'node:events',
	'node:path',
	'node:process',
	'node:os',
	'node:util',
]

async function checkBundleSize() {
	rmSync(bundleMetaFileName, { force: true })

	console.log('checking bundle size')
	await exec('yarn', [
		'esbuild',
		entry,
		'--bundle',
		'--outfile=/dev/null',
		'--minify',
		'--metafile=' + bundleMetaFileName,
		...EXTERNAL_DEPS.map((dep) => '--external:' + dep),
	])

	console.log(kleur.cyan().bold('Checking bundle size'), 'of', resolve(entry) + '\n')

	const meta = JSON.parse(readFileSync(bundleMetaFileName).toString()) as Meta
	const totalSize = Object.values(meta.outputs).reduce((acc, output) => acc + output.bytes, 0)
	if (totalSize === 0) {
		throw new Error('Invalid bundle meta in ' + process.cwd() + '/' + bundleMetaFileName)
	}

	if (totalSize > sizeLimit) {
		console.error(
			`${kleur.red().bold('ERROR')} Bundle size exceeds limit: ${totalSize} > ${sizeLimit}`
		)
		process.exit(1)
	}

	console.log(`Bundle size is within limit: ${totalSize} < ${sizeLimit}`)
}

checkBundleSize()
