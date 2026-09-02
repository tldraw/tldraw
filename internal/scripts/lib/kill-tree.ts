import { spawnSync } from 'child_process'

/**
 * Collect every descendant PID of `pid` by walking the process tree with `pgrep -P`.
 *
 * Returned breadth-first (direct children first, deepest descendants last). Callers that SIGKILL
 * the tree should reverse this so they kill deepest-first.
 */
export function descendantPids(pid: number): number[] {
	const result = spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' })
	const childPids = (result.stdout ?? '')
		.split('\n')
		.map((line) => Number(line.trim()))
		.filter((n) => Number.isInteger(n) && n > 0)
	return childPids.flatMap((childPid) => [childPid, ...descendantPids(childPid)])
}

/**
 * SIGKILL `pid` and its entire descendant tree.
 *
 * Our dev orchestrators spawn children through wrapper layers (`yarn run -T tsx …`) and processes
 * that fork their own grandchildren (vite → esbuild, wrangler → workerd, zero-cache → worker
 * subprocesses). `child.kill()` only signals the direct child, and SIGKILL is uncatchable and does
 * not cascade — so killing a wrapper or parent just orphans everything beneath it, leaving processes
 * that keep holding the fixed dev ports. Walking by PID crosses those wrapper and process-group
 * boundaries.
 *
 * Collect the PIDs up front so the tree does not reparent out from under us while we kill, then
 * SIGKILL deepest-first. The root `pid` itself is left alone so the caller can finish its own
 * shutdown and exit. Safe to call from signal and synchronous `exit` handlers.
 */
export function killProcessTree(pid: number) {
	for (const target of descendantPids(pid).reverse()) {
		try {
			process.kill(target, 'SIGKILL')
		} catch {
			// already gone
		}
	}
}
