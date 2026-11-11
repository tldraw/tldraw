import { rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import toml from 'toml'
import { exec } from './exec'
import { nicelog } from './nicelog'

// Replaces a Zero replication-manager (RM) without the gap that `flyctl deploy` leaves. An app with
// a volume is updated in place: the old RM stops before the new one starts, and view-syncers that
// need a backup or a change stream in between stall. Fly's bluegreen and canary strategies refuse
// apps with volumes, so this script makes the overlap itself, inside the same app so both RMs
// answer at `<app>.internal`:
//
//   1. create a fresh volume and start a second RM on it with the new config
//   2. wait for its checks to pass. Zero only answers /keepalive once the first backup of the new
//      RM's replica is confirmed, so a passing check means view-syncers can seed from it
//   3. stop the old RM. SIGTERM makes it drain its subscribers over to the new RM, and Fly's
//      restart policy does not apply to a stop. This must happen before the new RM's
//      ZERO_CHANGE_STREAMER_STARTUP_DELAY_MS (15s) runs out: past it the new RM takes the change
//      log, the old RM exits with an error, and restart policy `always` brings it back to take the
//      log back
//   4. destroy the old machine and its volume
//
// If the new RM never becomes healthy it is destroyed with its volume, and the old RM keeps
// serving.

const NEW_MACHINE_TIMEOUT_MS = 30 * 60 * 1000
const POLL_INTERVAL_MS = 2000

interface FlyMachineConfig {
	image?: string
	env?: Record<string, string>
	guest?: { cpu_kind?: string; cpus?: number; memory_mb?: number }
	checks?: Record<string, Record<string, unknown>>
	restart?: { policy?: string }
	stop_config?: { timeout?: string; signal?: string }
	mounts?: { volume?: string; path?: string; name?: string }[]
	metadata?: Record<string, string>
	[key: string]: unknown
}

interface FlyMachine {
	id: string
	name?: string
	state?: string
	region?: string
	checks?: { name?: string; status?: string }[]
	config?: FlyMachineConfig
}

interface FlyVolume {
	id: string
	name?: string
	attached_machine_id?: string | null
}

interface RenderedRmToml {
	primary_region: string
	kill_timeout: string
	build: { image: string }
	checks?: Record<string, Record<string, unknown>>
	restart?: { policy: string }[]
	vm: { memory: string; cpu_kind: string; cpus: number }[]
	mounts: { source: string; destination: string; initial_size: string }
	env: Record<string, string>
}

export function parseSizeMb(size: string): number {
	const match = size.trim().match(/^(\d+)\s*(mb|gb)$/i)
	if (!match) throw new Error(`Unrecognised size "${size}"; expected e.g. 512mb or 2gb`)
	return Number(match[1]) * (match[2].toLowerCase() === 'gb' ? 1024 : 1)
}

/**
 * The machine config for the new RM: the running machine's config, which carries what flyctl
 * deploy filled in (metadata, init), with everything the fly.toml owns replaced by the rendered
 * toml. Env is replaced wholesale so a variable removed from the template is dropped too.
 */
export function buildHandoffMachineConfig(
	current: FlyMachineConfig,
	renderedToml: string,
	volumeId: string
): FlyMachineConfig {
	const config = toml.parse(renderedToml) as RenderedRmToml
	const vm = config.vm[0]
	return {
		...current,
		image: config.build.image,
		env: {
			...config.env,
			FLY_PROCESS_GROUP: current.env?.FLY_PROCESS_GROUP ?? 'app',
			PRIMARY_REGION: config.primary_region,
		},
		guest: { cpu_kind: vm.cpu_kind, cpus: vm.cpus, memory_mb: parseSizeMb(vm.memory) },
		checks: config.checks,
		restart: { ...current.restart, policy: config.restart?.[0]?.policy ?? 'always' },
		stop_config: { ...current.stop_config, timeout: config.kill_timeout },
		mounts: [{ volume: volumeId, path: config.mounts.destination, name: config.mounts.source }],
	}
}

export function isHealthy(machine: FlyMachine | undefined): boolean {
	const checks = machine?.checks ?? []
	return (
		machine?.state === 'started' &&
		checks.length > 0 &&
		checks.every((check) => check.status === 'passing')
	)
}

async function flyJson<T>(args: string[]): Promise<T> {
	const stdout: string[] = []
	await exec('flyctl', [...args, '--json'], {
		processStdoutLine: (line) => stdout.push(line),
	})
	return JSON.parse(stdout.join('\n')) as T
}

async function listMachines(appName: string) {
	return (await flyJson<FlyMachine[] | null>(['machine', 'list', '-a', appName])) ?? []
}

async function listVolumes(appName: string) {
	return (await flyJson<FlyVolume[] | null>(['volumes', 'list', '-a', appName])) ?? []
}

async function destroyMachineAndVolume(appName: string, machineId: string, volumeId?: string) {
	await exec('flyctl', ['machine', 'destroy', machineId, '-a', appName, '--force'])
	if (volumeId) await exec('flyctl', ['volumes', 'destroy', volumeId, '-a', appName, '--yes'])
}

/**
 * Deploys `renderedToml` to the single-machine RM app with an overlap between the old and new RM.
 * Falls back to `flyctl deploy` when the app has no machine yet.
 */
export async function handOffReplicationManager({
	appName,
	renderedToml,
	configFile,
	pwd,
}: {
	appName: string
	renderedToml: string
	/** Written already; only used for the first-deploy fallback. */
	configFile: string
	pwd: string
}) {
	const machines = await listMachines(appName)
	if (machines.length === 0) {
		nicelog(`${appName}: no machine yet, creating it with flyctl deploy`)
		await exec('flyctl', ['deploy', '-a', appName, '-c', configFile], { pwd })
		return
	}
	// A second machine means an earlier handoff didn't finish; picking one to replace would be a
	// guess, so leave it to a person.
	if (machines.length !== 1) {
		throw new Error(
			`${appName}: expected 1 replication-manager machine, found ${machines.length} (${machines
				.map((m) => `${m.id} ${m.state}`)
				.join(', ')}). Destroy the stale one, keeping the healthy one, and rerun the deploy.`
		)
	}
	const [old] = machines
	if (!old.config) throw new Error(`${appName}: machine ${old.id} has no config`)
	const oldVolumeId = old.config.mounts?.[0]?.volume
	const parsed = toml.parse(renderedToml) as RenderedRmToml
	const region = old.region ?? parsed.primary_region

	const volume = await flyJson<FlyVolume>([
		'volumes',
		'create',
		parsed.mounts.source,
		'-a',
		appName,
		'-r',
		region,
		'-s',
		String(Math.max(1, Math.ceil(parseSizeMb(parsed.mounts.initial_size) / 1024))),
		'--require-unique-zone=false',
		'--yes',
	])
	nicelog(`${appName}: created volume ${volume.id} for the new replication-manager`)

	const machineConfig = buildHandoffMachineConfig(old.config, renderedToml, volume.id)
	const name = `${appName}-${Date.now().toString(36)}`
	// Holds env only (the RM's secrets are Fly app secrets), but it's a temp file all the same.
	const configPath = path.join(tmpdir(), `${name}.json`)
	writeFileSync(configPath, JSON.stringify(machineConfig), 'utf-8')
	let newMachine: FlyMachine | undefined
	try {
		await exec('flyctl', [
			'machine',
			'run',
			parsed.build.image,
			'-a',
			appName,
			'-r',
			region,
			'--name',
			name,
			'--machine-config',
			configPath,
			'--detach',
		])
		newMachine = (await listMachines(appName)).find((m) => m.name === name)
		if (!newMachine) throw new Error(`${appName}: new machine ${name} not found after machine run`)
		nicelog(`${appName}: started ${newMachine.id}, waiting for its first backup`)

		const deadline = Date.now() + NEW_MACHINE_TIMEOUT_MS
		let lastLog = 0
		for (;;) {
			const current = (await listMachines(appName)).find((m) => m.id === newMachine!.id)
			if (isHealthy(current)) break
			if (Date.now() > deadline) {
				throw new Error(
					`${appName}: new machine ${newMachine.id} not healthy after ${NEW_MACHINE_TIMEOUT_MS / 60000} min (state ${current?.state}, checks ${JSON.stringify(current?.checks)})`
				)
			}
			if (Date.now() - lastLog > 60_000) {
				nicelog(`${appName}: ${newMachine.id} is ${current?.state}, checks not passing yet`)
				lastLog = Date.now()
			}
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
		}
	} catch (e) {
		nicelog(`${appName}: handoff failed, removing the new machine; ${old.id} keeps serving`)
		try {
			if (newMachine) await destroyMachineAndVolume(appName, newMachine.id, volume.id)
			else await exec('flyctl', ['volumes', 'destroy', volume.id, '-a', appName, '--yes'])
		} catch (cleanupError) {
			nicelog(`${appName}: cleanup failed, remove it by hand`, cleanupError)
		}
		throw e
	} finally {
		rmSync(configPath, { force: true })
	}

	nicelog(`${appName}: ${newMachine.id} is healthy, stopping ${old.id} so it drains to it`)
	await exec('flyctl', ['machine', 'stop', old.id, '-a', appName])
	await exec('flyctl', [
		'machine',
		'wait',
		old.id,
		'-a',
		appName,
		'--state',
		'stopped',
		'--wait-timeout',
		'6m',
	])
	await destroyMachineAndVolume(appName, old.id, oldVolumeId)

	const leftover = (await listVolumes(appName)).filter((v) => !v.attached_machine_id)
	if (leftover.length > 0) {
		nicelog(`${appName}: unattached volumes left over: ${leftover.map((v) => v.id).join(', ')}`)
	}
	nicelog(`${appName}: replication-manager handed off from ${old.id} to ${newMachine.id}`)
}
