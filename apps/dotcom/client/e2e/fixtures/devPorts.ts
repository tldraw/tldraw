import fs from 'fs'
import path from 'path'

// The parallel-dev wrapper (internal/scripts/dotcom-dev-parallel.ts) runs each worktree's stack on its
// own port block and writes the block's env to <repoRoot>/.dev-ports.json. These e2e helpers run in a
// separate process that can't inherit that env, so they read the file (trying a few candidate repo
// roots, since the test process's cwd is the client workspace) and fall back to the natural single-
// stack / CI ports when it isn't present.
function readDevPorts(): Record<string, string> {
	for (const root of [
		path.resolve(__dirname, '../../../../..'),
		path.resolve(process.cwd(), '../../..'),
		process.cwd(),
	]) {
		try {
			return JSON.parse(fs.readFileSync(path.join(root, '.dev-ports.json'), 'utf8'))
		} catch {
			// not here — try the next candidate root
		}
	}
	return {}
}

const devPorts = readDevPorts()

// The running stack's client origin (index 0 / CI == http://localhost:3000). Fixtures navigate and
// hit APIs here so an offset worktree's tests reach the right server instead of always :3000.
export const CLIENT_ORIGIN = devPorts.CLIENT_PORT
	? `http://localhost:${devPorts.CLIENT_PORT}`
	: 'http://localhost:3000'

export const POOLED_CONNECTION_STRING =
	devPorts.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING ??
	'postgresql://user:password@127.0.0.1:6432/postgres'
