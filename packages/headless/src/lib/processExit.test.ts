import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function runFixture(fixture: string) {
	return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
		execFile(
			process.execPath,
			['--import', 'tsx', path.join('src', 'test', 'fixtures', fixture)],
			{ cwd: packageRoot, timeout: 30_000 },
			(error, stdout, stderr) => {
				resolve({ code: error ? ((error as any).code ?? 1) : 0, stdout, stderr })
			}
		)
	})
}

// The contract: nothing in the import graph or editor lifecycle holds the Node event loop open.
// If a future dependency opens a MessageChannel, an un-unref'd BroadcastChannel, or a live
// timer at import time, these tests hang and fail on their 30s spawn timeout.
describe('process exit', () => {
	it('exits on its own after editor.dispose()', async () => {
		const result = await runFixture('exit-check.ts')
		expect(result.stderr).not.toMatch(/Error/)
		expect(result.stdout).toContain('DISPOSED_OK')
		expect(result.code).toBe(0)
	}, 30_000)

	it('exits on its own even without dispose (all timers are unref’d)', async () => {
		const result = await runFixture('exit-check-no-dispose.ts')
		expect(result.stderr).not.toMatch(/Error/)
		expect(result.stdout).toContain('NO_DISPOSE_OK')
		expect(result.code).toBe(0)
	}, 30_000)

	it('importing tldraw/headless-defaults alone exits cleanly with no global document', async () => {
		const result = await runFixture('import-defaults-check.ts')
		expect(result.stderr).not.toMatch(/Error/)
		expect(result.stdout).toContain('IMPORT_DEFAULTS_OK')
		expect(result.code).toBe(0)
	}, 30_000)

	it('exits promptly after a closed sync session (no leaked room prune timer)', async () => {
		const result = await runFixture('exit-check-sync.ts')
		expect(result.stderr).not.toMatch(/Error/)
		expect(result.stdout).toContain('SYNC_CLOSED_OK')
		expect(result.code).toBe(0)
		// Measure from the fixture's own shutdown timestamp, not from spawn: tsx cold-start
		// belongs to CI weather, while everything after SYNC_CLOSED_OK is the thing under
		// test — a leaked prune timer adds SESSION_REMOVAL_WAIT_TIME (5s) right there.
		const closedAt = Number(result.stdout.match(/SYNC_CLOSED_OK (\d+)/)?.[1])
		expect(closedAt).toBeGreaterThan(0)
		expect(Date.now() - closedAt).toBeLessThan(4000)
	}, 30_000)
})
