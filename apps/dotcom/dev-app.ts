/* eslint-disable no-console */
import { spawn } from 'child_process'
import { mkdirSync } from 'fs'
import { buildDotcomDevEnv } from './zero-cache/dev-env'
import { resolveDotcomDevInstance } from './zero-cache/dev-instance'

// Resolve this worktree's dev instance once, then run the dotcom dev stack under lazyrepo with the
// instance exported. Every dev task (client, workers, zero-cache) derives its ports and per-instance
// Docker/Zero/Wrangler state from the instance, so one stack can run per worktree side by side.
// `DOTCOM_DEV_INSTANCE` (set by the user) overrides the automatic assignment.
const instance = resolveDotcomDevInstance({ allocate: true })
const env = buildDotcomDevEnv({ instance })

// Wrangler shares a global service-binding registry by default; point it at a per-instance dir so a
// second stack's workers don't re-register the shared worker names and cross-wire the instances.
mkdirSync(env.wranglerRegistryDir, { recursive: true })

console.log(`Starting dotcom dev stack (instance ${instance}, ports ${env.portBlockStart}+):`)
console.log(`  client       http://localhost:${env.ports.client}`)
console.log(`  sync worker  http://localhost:${env.ports.syncWorker}`)
console.log(`  zero         http://localhost:${env.ports.zero}`)
console.log(`  postgres     127.0.0.1:${env.ports.postgres}`)
console.log('')

const child = spawn(
	'yarn',
	['lazy', 'run', 'dev', '--filter=apps/dotcom/*', '--filter=packages/tldraw'],
	{
		stdio: 'inherit',
		env: {
			...process.env,
			LAZYREPO_PRETTY_OUTPUT: '0',
			DOTCOM_DEV_INSTANCE: String(instance),
			WRANGLER_REGISTRY_PATH: env.wranglerRegistryDir,
		},
	}
)

let shuttingDown = false
const stop = (signal: NodeJS.Signals) => {
	if (shuttingDown) return
	shuttingDown = true
	if (!child.killed) child.kill(signal)
}
process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
process.on('SIGHUP', () => stop('SIGHUP'))
process.on('exit', () => {
	if (!child.killed) child.kill('SIGKILL')
})

child.once('error', (error) => {
	console.error(error)
	process.exit(1)
})
child.once('exit', (code, signal) => {
	process.exit(signal ? 1 : (code ?? 0))
})
