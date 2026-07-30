import { spawn } from 'child_process'
import { createServer } from 'net'
import { pathToFileURL } from 'url'
import { killProcessTree } from '../../../../internal/scripts/lib/kill-tree'

// Offset per worktree by the parallel-dev wrapper (internal/scripts/dotcom-dev-parallel.ts).
const CLIENT_PORT = Number(process.env.CLIENT_PORT) || 3000
const SKIPPABLE_PROBE_ERROR_CODES = new Set(['EADDRNOTAVAIL', 'EAFNOSUPPORT'])

type PortProbe = (port: number, host: string) => Promise<void>

function probePort(port: number, host: string) {
	return new Promise<void>((resolve, reject) => {
		const server = createServer()
		server.unref()
		server.once('error', reject)
		server.listen(port, host, () => {
			server.close(() => resolve())
		})
	})
}

export async function assertPortFree(
	port: number,
	hosts = ['0.0.0.0', '::'],
	probe: PortProbe = probePort
) {
	for (const host of hosts) {
		try {
			await probe(port, host)
		} catch (error: any) {
			if (error?.code === 'EADDRINUSE') {
				throw new Error(
					`Port ${port} is already in use. Stop the process using port ${port} before running yarn dev-app.`
				)
			}
			if (SKIPPABLE_PROBE_ERROR_CODES.has(error?.code)) {
				continue
			}
			throw error
		}
	}
}

export function getViteArgs(command: 'dev' | 'preview', port = CLIENT_PORT) {
	return [command, '--host', '--port', String(port), '--strictPort']
}

async function main() {
	await assertPortFree(CLIENT_PORT)

	const args = getViteArgs(process.env.VITE_PREVIEW === '1' ? 'preview' : 'dev')
	const child = spawn('vite', args, { stdio: 'inherit' })

	// On shutdown, reap vite *and its children* (esbuild/optimizer helpers) by walking the PID tree
	// and killing deepest-first. This runs in the signal handler, while the tree is still alive —
	// not on `exit` — because once vite exits its helpers reparent to launchd and a `pgrep` walk from
	// us can no longer find them, so they would orphan and keep holding port 3000.
	let shuttingDown = false
	const shutdown = () => {
		if (shuttingDown) return
		shuttingDown = true
		killProcessTree(process.pid)
		process.exit(0)
	}
	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)
	process.on('SIGHUP', shutdown)
	// Backstop for any exit path that bypassed the signal handler.
	process.on('exit', () => killProcessTree(process.pid))

	child.once('error', (error) => {
		console.error(error)
		process.exit(1)
	})
	child.once('exit', (code, signal) => {
		if (shuttingDown) return
		process.exit(signal ? 1 : (code ?? 0))
	})
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error)
		process.exit(1)
	})
}
