import { spawnSync } from 'child_process'
import {
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { assertValidDotcomDevInstance, DOTCOM_DEV_MAX_INSTANCES } from './dev-env'

// A machine-global registry that maps a worktree's absolute path to a stable dev instance number.
// Keeping it stable means each worktree keeps its own ports and database across restarts; keeping it
// machine-global (rather than per-repo) means separate clones get distinct instances too.
const REGISTRY_FILE = join(homedir(), '.tldraw', 'dotcom-dev-instances.json')
const LOCK_DIR = `${REGISTRY_FILE}.lock`
const LOCK_STALE_MS = 30_000
const LOCK_TIMEOUT_MS = 10_000

type Registry = Record<string, number>

function sleepSync(ms: number) {
	// Synchronous sleep with no dependencies, so the short lock-retry loop below stays simple.
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** Resolve the current worktree's root, falling back to the process cwd outside a git checkout. */
function getWorktreeKey() {
	const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })
	const top = result.status === 0 ? result.stdout.trim() : ''
	const path = top || process.cwd()
	try {
		return realpathSync(path)
	} catch {
		return path
	}
}

function readRegistry(): Registry {
	try {
		const parsed = JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'))
		return parsed && typeof parsed === 'object' ? (parsed as Registry) : {}
	} catch {
		return {}
	}
}

function writeRegistry(registry: Registry) {
	mkdirSync(dirname(REGISTRY_FILE), { recursive: true })
	writeFileSync(REGISTRY_FILE, `${JSON.stringify(registry, null, 2)}\n`)
}

/** Atomic mkdir-based lock, with stale-lock stealing so a crashed `dev-app` can't wedge allocation. */
function withRegistryLock<T>(fn: () => T): T {
	mkdirSync(dirname(LOCK_DIR), { recursive: true })
	const start = Date.now()
	for (;;) {
		try {
			mkdirSync(LOCK_DIR)
			break
		} catch (error: any) {
			if (error?.code !== 'EEXIST') throw error
			try {
				if (Date.now() - statSync(LOCK_DIR).mtimeMs > LOCK_STALE_MS) {
					rmSync(LOCK_DIR, { recursive: true, force: true })
					continue
				}
			} catch {
				// Lock vanished between our mkdir and stat; retry immediately.
			}
			if (Date.now() - start > LOCK_TIMEOUT_MS) {
				throw new Error(`Timed out acquiring the dotcom dev instance lock at ${LOCK_DIR}.`)
			}
			sleepSync(100)
		}
	}
	try {
		return fn()
	} finally {
		rmSync(LOCK_DIR, { recursive: true, force: true })
	}
}

/**
 * Resolve the dev instance number for the current worktree.
 *
 * `DOTCOM_DEV_INSTANCE` always wins when set. Otherwise we look the worktree up in the shared
 * registry; with `allocate`, a worktree we've never seen claims the lowest free instance and the
 * choice is persisted so it's stable across runs. Without `allocate` (clean/doctor), an unregistered
 * worktree resolves to the default instance 0 rather than reserving a slot.
 */
export function resolveDotcomDevInstance({ allocate }: { allocate: boolean }): number {
	const fromEnv = process.env.DOTCOM_DEV_INSTANCE
	if (fromEnv !== undefined && fromEnv !== '') {
		return assertValidDotcomDevInstance(Number(fromEnv))
	}

	const worktree = getWorktreeKey()

	if (!allocate) {
		return readRegistry()[worktree] ?? 0
	}

	return withRegistryLock(() => {
		const registry = readRegistry()
		// Drop entries for worktrees that no longer exist so their instances can be reused.
		for (const path of Object.keys(registry)) {
			if (!existsSync(path)) delete registry[path]
		}

		if (registry[worktree] === undefined) {
			const used = new Set(Object.values(registry))
			let instance = 0
			while (used.has(instance)) instance++
			if (instance >= DOTCOM_DEV_MAX_INSTANCES) {
				throw new Error(
					`Too many concurrent dotcom dev stacks (max ${DOTCOM_DEV_MAX_INSTANCES}). ` +
						`Stop one, run \`yarn dev-app:clean\` in a worktree you're done with, or set ` +
						`DOTCOM_DEV_INSTANCE to reuse a slot.`
				)
			}
			registry[worktree] = instance
		}

		writeRegistry(registry)
		return registry[worktree]
	})
}
