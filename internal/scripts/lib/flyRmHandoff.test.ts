import { describe, expect, it } from 'vitest'
import {
	buildHandoffMachineConfig,
	HANDOFF_STARTUP_DELAY_MS,
	isHealthy,
	parseSizeMb,
	planInterruptedHandoff,
} from './flyRmHandoff'

const renderedToml = `
app = "staging-zero-rm"
primary_region = "fra"
kill_timeout = "5m"

[build]
image = "registry.hub.docker.com/rocicorp/zero:1.11.5"

[checks]
  [checks.keepalive]
  type = "http"
  port = 4849
  grace_period = "30s"
  interval = "5s"
  timeout = "5s"
  path = "/keepalive"

[[restart]]
policy = "always"

[[vm]]
memory = "1gb"
cpu_kind = "shared"
cpus = 1

[mounts]
source = "sqlite_repl"
destination = "/data"
initial_size = "1gb"

[env]
ZERO_REPLICA_FILE = "/data/sync-replica.db"
TLDRAW_DEPLOY_INPUT_HASH = "abc"
`

describe('buildHandoffMachineConfig', () => {
	it('keeps what flyctl deploy filled in and replaces what the toml owns', () => {
		const current = {
			image: 'registry-1.docker.io/rocicorp/zero:1.11.3',
			init: {},
			env: { FLY_PROCESS_GROUP: 'app', PRIMARY_REGION: 'fra', REMOVED_VAR: '1' },
			guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 512 },
			restart: { policy: 'on-failure', max_retries: 10 },
			stop_config: { timeout: '1m', signal: 'SIGINT' },
			mounts: [{ volume: 'vol_old', path: '/data', name: 'sqlite_repl' }],
			metadata: { fly_process_group: 'app', fly_release_version: '41' },
		}
		expect(buildHandoffMachineConfig(current, renderedToml, 'vol_new')).toEqual({
			image: 'registry.hub.docker.com/rocicorp/zero:1.11.5',
			init: {},
			env: {
				ZERO_REPLICA_FILE: '/data/sync-replica.db',
				TLDRAW_DEPLOY_INPUT_HASH: 'abc',
				FLY_PROCESS_GROUP: 'app',
				PRIMARY_REGION: 'fra',
				ZERO_CHANGE_STREAMER_STARTUP_DELAY_MS: String(HANDOFF_STARTUP_DELAY_MS),
			},
			guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 1024 },
			checks: {
				keepalive: {
					type: 'http',
					port: 4849,
					grace_period: '30s',
					interval: '5s',
					timeout: '5s',
					path: '/keepalive',
				},
			},
			restart: { policy: 'always', max_retries: 10 },
			stop_config: { timeout: '5m', signal: 'SIGINT' },
			mounts: [{ volume: 'vol_new', path: '/data', name: 'sqlite_repl' }],
			metadata: { fly_process_group: 'app', fly_release_version: '41' },
		})
	})
})

describe('parseSizeMb', () => {
	it('parses mb and gb', () => {
		expect([parseSizeMb('512mb'), parseSizeMb('2gb'), parseSizeMb('8GB')]).toEqual([
			512, 2048, 8192,
		])
	})

	it('rejects anything else', () => {
		expect(() => parseSizeMb('2g')).toThrow()
	})
})

describe('isHealthy', () => {
	it('needs a started machine with every check passing', () => {
		expect([
			isHealthy({ id: 'a', state: 'started', checks: [{ status: 'passing' }] }),
			isHealthy({ id: 'a', state: 'started', checks: [] }),
			isHealthy({ id: 'a', state: 'started', checks: [{ status: 'critical' }] }),
			isHealthy({ id: 'a', state: 'starting', checks: [{ status: 'passing' }] }),
			isHealthy(undefined),
		]).toEqual([true, false, false, false, false])
	})
})

describe('planInterruptedHandoff', () => {
	const m = (id: string, state: string, created_at: string) => ({ id, state, created_at })

	it('replaces the running RM with the newest once the newest is healthy', () => {
		expect(
			planInterruptedHandoff([
				m('new', 'started', '2026-11-11T13:00:00Z'),
				m('old', 'started', '2026-11-11T12:00:00Z'),
			])
		).toEqual({
			newest: m('new', 'started', '2026-11-11T13:00:00Z'),
			running: m('old', 'started', '2026-11-11T12:00:00Z'),
			stale: [],
		})
	})

	it('destroys an older RM the handoff already stopped', () => {
		expect(
			planInterruptedHandoff([
				m('old', 'stopped', '2026-11-11T12:00:00Z'),
				m('new', 'started', '2026-11-11T13:00:00Z'),
			])
		).toEqual({
			newest: m('new', 'started', '2026-11-11T13:00:00Z'),
			running: undefined,
			stale: [m('old', 'stopped', '2026-11-11T12:00:00Z')],
		})
	})

	it('refuses to guess between several running RMs', () => {
		expect(() =>
			planInterruptedHandoff([
				m('a', 'started', '2026-11-11T11:00:00Z'),
				m('b', 'started', '2026-11-11T12:00:00Z'),
				m('c', 'started', '2026-11-11T13:00:00Z'),
			])
		).toThrow()
	})
})
