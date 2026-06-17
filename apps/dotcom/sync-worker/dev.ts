/* eslint-disable no-console */
import { spawn } from 'child_process'
import { getDotcomDevEnv } from '../zero-cache/dev-env'

const env = getDotcomDevEnv()

console.log(`Wrangler state: ${env.wranglerPersistDir}`)

const upstreamDb = `postgresql://user:password@127.0.0.1:${env.ports.postgres}/postgres`
const pooledDb = `postgresql://user:password@127.0.0.1:${env.ports.pgbouncer}/postgres`

// Pass this instance's serving and inspector ports explicitly, plus override the URLs and
// connection strings that wrangler.toml's [env.dev] block points at fixed ports so they follow this
// instance's block too.
const child = spawn(
	'yarn',
	[
		'run',
		'-T',
		'tsx',
		'../../../internal/scripts/workers/dev.ts',
		'--port',
		String(env.ports.syncWorker),
		'--inspector-port',
		String(env.ports.syncWorkerInspector),
		'--persist-to',
		env.wranglerPersistDir,
		'--var',
		`ASSET_UPLOAD_ORIGIN:http://localhost:${env.ports.assetUploadWorker}`,
		'--var',
		`USER_CONTENT_URL:http://localhost:${env.ports.userContentWorker}`,
		'--var',
		`MULTIPLAYER_SERVER:http://localhost:${env.ports.client}`,
		'--var',
		`BOTCOM_POSTGRES_CONNECTION_STRING:${upstreamDb}`,
		'--var',
		`BOTCOM_POSTGRES_POOLED_CONNECTION_STRING:${pooledDb}`,
	],
	{
		cwd: env.syncWorkerDir,
		env: process.env,
		stdio: 'inherit',
	}
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
