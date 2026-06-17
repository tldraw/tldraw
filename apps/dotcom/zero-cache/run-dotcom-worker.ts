/* eslint-disable no-console */
import { spawn } from 'child_process'
import { type DotcomDevPortName, getDotcomDevEnv } from './dev-env'

// Runs a dotcom worker under the shared worker dev runner with this instance's serving and inspector
// ports. Usage: `tsx ../zero-cache/run-dotcom-worker.ts <serviceKey> [extra wrangler args]`, run from
// the worker's package directory. `serviceKey` is the worker's port name in dev-env (e.g.
// `assetUploadWorker`); its inspector port is `<serviceKey>Inspector`.
const [serviceKey, ...extraArgs] = process.argv.slice(2) as [DotcomDevPortName, ...string[]]
const env = getDotcomDevEnv()

const port = env.ports[serviceKey]
const inspectorPort = env.ports[`${serviceKey}Inspector` as DotcomDevPortName]
if (port == null || inspectorPort == null) {
	throw new Error(`Unknown dotcom worker "${serviceKey}".`)
}

const child = spawn(
	'yarn',
	[
		'run',
		'-T',
		'tsx',
		'../../../internal/scripts/workers/dev.ts',
		'--port',
		String(port),
		'--inspector-port',
		String(inspectorPort),
		...extraArgs,
	],
	{ env: process.env, stdio: 'inherit' }
)

child.once('exit', (code) => process.exit(code ?? 1))
child.once('error', (error) => {
	console.error(error)
	process.exit(1)
})

process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
process.on('SIGHUP', () => child.kill('SIGHUP'))
process.on('exit', () => {
	if (!child.killed) child.kill('SIGKILL')
})
