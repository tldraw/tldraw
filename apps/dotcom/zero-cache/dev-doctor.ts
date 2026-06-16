/* eslint-disable no-console */
import { spawnSync } from 'child_process'
import { existsSync, statSync } from 'fs'
import { Socket } from 'net'
import {
	DOTCOM_DEV_PORTS,
	getDotcomDevCleanTargets,
	getDotcomDevEnv,
	type DotcomDevEnv,
} from './dev-env'

const env = getDotcomDevEnv()
const targets = getDotcomDevCleanTargets(env)

function formatStatus(ok: boolean, detail?: string) {
	return ok ? `ok${detail ? ` (${detail})` : ''}` : `not ready${detail ? ` (${detail})` : ''}`
}

async function checkPort(port: number) {
	return new Promise<boolean>((resolve) => {
		const socket = new Socket()
		socket.setTimeout(500)
		socket.once('connect', () => {
			socket.destroy()
			resolve(true)
		})
		socket.once('timeout', () => {
			socket.destroy()
			resolve(false)
		})
		socket.once('error', () => resolve(false))
		socket.connect(port, '127.0.0.1')
	})
}

async function checkHttp(url: string, requireOk: boolean) {
	try {
		const response = await fetch(url)
		return {
			ok: requireOk ? response.ok : true,
			detail: `HTTP ${response.status}`,
		}
	} catch (error) {
		return {
			ok: false,
			detail: error instanceof Error ? error.message : String(error),
		}
	}
}

function checkDockerVolume(name: string) {
	const result = spawnSync('docker', ['volume', 'inspect', name], {
		stdio: 'ignore',
	})
	if (result.error) return { ok: false, detail: result.error.message }
	return { ok: result.status === 0, detail: result.status === 0 ? 'exists' : 'missing' }
}

function checkSchemaFreshness(devEnv: DotcomDevEnv) {
	if (!existsSync(devEnv.schemaFile)) return { ok: false, detail: 'missing' }
	if (!existsSync(devEnv.schemaSourceFile)) return { ok: false, detail: 'source missing' }

	const schema = statSync(devEnv.schemaFile)
	const source = statSync(devEnv.schemaSourceFile)
	if (schema.mtimeMs >= source.mtimeMs) {
		return { ok: true, detail: 'fresh' }
	}
	return { ok: false, detail: 'stale' }
}

async function main() {
	const postgresPort = await checkPort(DOTCOM_DEV_PORTS.postgres)
	const pgbouncerPort = await checkPort(DOTCOM_DEV_PORTS.pgbouncer)
	const migrations = await checkHttp(`http://localhost:${DOTCOM_DEV_PORTS.migrations}`, true)
	const zero = await checkHttp(`http://localhost:${DOTCOM_DEV_PORTS.zero}/`, true)
	const syncWorker = await checkHttp(`http://localhost:${DOTCOM_DEV_PORTS.syncWorker}/`, false)
	const volume = checkDockerVolume(targets.postgresVolumeName)
	const schema = checkSchemaFreshness(env)

	console.log('Dotcom dev doctor')
	console.log('')
	console.log(`Branch: ${env.branchName ?? '(detached)'}`)
	console.log(`Commit: ${env.shortCommitSha ?? '(unknown)'}`)
	console.log(`Branch key: ${env.branchKey}`)
	console.log(`Compose project: ${env.composeProjectName}`)
	console.log(
		`Postgres volume: ${env.postgresVolumeName} - ${formatStatus(volume.ok, volume.detail)}`
	)
	console.log(
		`Zero replica: ${env.zeroReplicaFile} - ${existsSync(env.zeroReplicaFile) ? 'exists' : 'missing'}`
	)
	console.log(
		`Wrangler state: ${env.wranglerPersistDir} - ${existsSync(env.wranglerPersistDir) ? 'exists' : 'missing'}`
	)
	console.log(`Generated schema: ${env.schemaFile} - ${formatStatus(schema.ok, schema.detail)}`)
	console.log('')
	console.log('Ports and services')
	console.log(`Postgres ${DOTCOM_DEV_PORTS.postgres}: ${formatStatus(postgresPort)}`)
	console.log(`PgBouncer ${DOTCOM_DEV_PORTS.pgbouncer}: ${formatStatus(pgbouncerPort)}`)
	console.log(
		`Migrations ${DOTCOM_DEV_PORTS.migrations}: ${formatStatus(migrations.ok, migrations.detail)}`
	)
	console.log(`Zero ${DOTCOM_DEV_PORTS.zero}: ${formatStatus(zero.ok, zero.detail)}`)
	console.log(
		`Sync worker ${DOTCOM_DEV_PORTS.syncWorker}: ${formatStatus(syncWorker.ok, syncWorker.detail)}`
	)
	console.log('')
	console.log('Suggested cleanup: yarn dev-app:clean')
	console.log(`Browser reset: ${env.resetLocalStateUrl}`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
