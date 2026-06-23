/* eslint-disable no-console */
import { spawn } from 'child_process'
import { killProcessTree } from '../../../internal/scripts/lib/kill-tree'
import { getDotcomDevEnv } from '../zero-cache/dev-env'

const env = getDotcomDevEnv()

console.log(`Wrangler state: ${env.wranglerPersistDir}`)

const child = spawn(
	'yarn',
	[
		'run',
		'-T',
		'tsx',
		'../../../internal/scripts/workers/dev.ts',
		'--persist-to',
		env.wranglerPersistDir,
		'--var',
		'ASSET_UPLOAD_ORIGIN:http://localhost:8788',
		'--var',
		'USER_CONTENT_URL:http://localhost:8789',
	],
	{
		cwd: env.syncWorkerDir,
		env: process.env,
		stdio: 'inherit',
	}
)

// On shutdown, reap the whole subtree while it is still alive. The direct child is a
// `yarn run -T tsx …` wrapper, so just signalling it would let the tsx → node → wrangler → workerd
// processes beneath it reparent to launchd and keep holding the dev port. Walking by PID,
// deepest-first, crosses those wrapper boundaries. We do this in the signal handler (not on `exit`)
// so the tree is still enumerable.
let shuttingDown = false
const shutdown = () => {
	if (shuttingDown) return
	shuttingDown = true
	killProcessTree(process.pid)
	process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('SIGHUP', shutdown)
// Backstop for any exit path that bypassed the signal handler.
process.on('exit', () => killProcessTree(process.pid))

child.once('exit', (code) => {
	if (shuttingDown) return
	process.exit(code ?? 1)
})
child.once('error', (error) => {
	console.error(error)
	process.exit(1)
})
