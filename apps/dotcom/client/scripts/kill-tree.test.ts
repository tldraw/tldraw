import { spawn } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { killProcessTree } from '../../../../internal/scripts/lib/kill-tree'

// `killProcessTree` lives in internal/scripts/lib, but only apps/** and packages/** are wired into
// the root vitest config, so its regression test lives here alongside dev-app.test.ts (the dotcom
// dev script that depends on it).

// A process that records its own pid, optionally spawns one more level below itself, then idles.
// Running `node nest.cjs <depth> <pidfile>` builds a chain `depth` levels deep so we can prove the
// reap crosses more than one wrapper layer (the real tree is orchestrator → yarn → tsx → wrangler →
// workerd).
const NEST_SCRIPT = `
const { spawn } = require('child_process')
const { appendFileSync } = require('fs')
const depth = Number(process.argv[2])
const pidfile = process.argv[3]
appendFileSync(pidfile, process.pid + '\\n')
if (depth > 0) {
	spawn(process.execPath, [__filename, String(depth - 1), pidfile], { stdio: 'ignore' })
}
setInterval(() => {}, 1 << 30)
`

let dir: string
let pidfile: string
let scriptPath: string
let spawned: number[] = []

function isAlive(pid: number) {
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
	}
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (predicate()) return
		await new Promise((r) => setTimeout(r, 25))
	}
	throw new Error('timed out waiting for condition')
}

function recordedPids() {
	try {
		return readFileSync(pidfile, 'utf8')
			.split('\n')
			.map((l) => Number(l.trim()))
			.filter((n) => Number.isInteger(n) && n > 0)
	} catch {
		return []
	}
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'kill-tree-'))
	pidfile = join(dir, 'pids.txt')
	scriptPath = join(dir, 'nest.cjs')
	writeFileSync(scriptPath, NEST_SCRIPT)
	writeFileSync(pidfile, '')
	spawned = []
})

afterEach(() => {
	// Clean up anything the test left alive so a failure can't leak processes.
	for (const pid of [...spawned, ...recordedPids()]) {
		try {
			process.kill(pid, 'SIGKILL')
		} catch {
			// already gone
		}
	}
	rmSync(dir, { recursive: true, force: true })
})

describe('killProcessTree', () => {
	it('reaps the whole descendant tree while leaving the root alive', async () => {
		// root → child → grandchild (3 processes total).
		const root = spawn(process.execPath, [scriptPath, '2', pidfile], { stdio: 'ignore' })
		spawned.push(root.pid!)

		await waitFor(() => recordedPids().length === 3)
		const [rootPid, childPid, grandchildPid] = recordedPids()
		expect(rootPid).toBe(root.pid)
		expect(isAlive(childPid)).toBe(true)
		expect(isAlive(grandchildPid)).toBe(true)

		killProcessTree(rootPid)

		// The descendants (child and grandchild) are reaped; the root is intentionally left alone so a
		// caller can finish its own shutdown and exit.
		await waitFor(() => !isAlive(childPid) && !isAlive(grandchildPid))
		expect(isAlive(childPid)).toBe(false)
		expect(isAlive(grandchildPid)).toBe(false)
		expect(isAlive(rootPid)).toBe(true)
	})

	it('does nothing when the pid has no descendants', async () => {
		// A leaf process (depth 0) with no children: the reap should be a no-op and leave it running.
		const leaf = spawn(process.execPath, [scriptPath, '0', pidfile], { stdio: 'ignore' })
		spawned.push(leaf.pid!)

		await waitFor(() => recordedPids().length === 1)
		expect(() => killProcessTree(leaf.pid!)).not.toThrow()
		expect(isAlive(leaf.pid!)).toBe(true)
	})
})
