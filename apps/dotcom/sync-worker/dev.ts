/* eslint-disable no-console */
import { spawn } from 'child_process'
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
