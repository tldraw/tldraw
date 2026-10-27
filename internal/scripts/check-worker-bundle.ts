import { existsSync, readFileSync, rmSync } from 'fs'
import { resolve } from 'path'
import { parseArgs, styleText } from 'util'
import { exec } from './lib/exec'
import { WORKER_EXTERNAL_DEPS } from './lib/worker-externals'

const { values: args } = parseArgs({
	options: {
		'size-limit-bytes': { type: 'string' },
		entry: { type: 'string' },
	},
	strict: false,
})
const sizeLimit = Number(args['size-limit-bytes'])
if (!isFinite(sizeLimit) || sizeLimit < 1) {
	console.error(
		'Invalid usage. Usage: pnpm exec tsx check-worker-bundle.ts --size-limit-bytes <size> --entry <entry>'
	)
	process.exit(1)
}

// strict: false yields `true` for a bare `--entry`, which should fail like a missing file
const entry = typeof args['entry'] === 'string' ? args['entry'] : ''
if (!existsSync(entry)) {
	console.error('Entry file does not exist:', args['entry'])
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

async function checkBundleSize() {
	rmSync(bundleMetaFileName, { force: true })

	console.log('checking bundle size')
	await exec('pnpm', [
		'esbuild',
		entry,
		'--bundle',
		'--outfile=/dev/null',
		'--minify',
		'--metafile=' + bundleMetaFileName,
		...WORKER_EXTERNAL_DEPS.map((dep) => '--external:' + dep),
	])

	console.log(styleText(['cyan', 'bold'], 'Checking bundle size'), 'of', resolve(entry) + '\n')

	const meta = JSON.parse(readFileSync(bundleMetaFileName).toString()) as Meta
	const totalSize = Object.values(meta.outputs).reduce((acc, output) => acc + output.bytes, 0)
	if (totalSize === 0) {
		throw new Error('Invalid bundle meta in ' + process.cwd() + '/' + bundleMetaFileName)
	}

	if (totalSize > sizeLimit) {
		console.error(
			`${styleText(['red', 'bold'], 'ERROR')} Bundle size exceeds limit: ${totalSize} > ${sizeLimit}`
		)
		process.exit(1)
	}

	console.log(`Bundle size is within limit: ${totalSize} < ${sizeLimit}`)
}

checkBundleSize()
