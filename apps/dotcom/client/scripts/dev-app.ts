import { spawn } from 'child_process'
import { createServer } from 'net'
import { pathToFileURL } from 'url'
import { getDotcomDevEnv } from '../../zero-cache/dev-env'

// `yarn dev-app` exports DOTCOM_DEV_INSTANCE so each worktree's stack uses its own port block.
const CLIENT_PORT = getDotcomDevEnv().ports.client
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

	// Forward termination signals to vite and make sure it is killed if this process exits for any
	// other reason. Without this, an unclean exit (closed terminal, killed parent) leaves vite
	// holding port 3000, which blocks the next `yarn dev-app`.
	let shuttingDown = false
	const stop = (signal: NodeJS.Signals) => {
		if (shuttingDown) return
		shuttingDown = true
		if (!child.killed) child.kill(signal)
	}
	process.on('SIGINT', () => stop('SIGINT'))
	process.on('SIGTERM', () => stop('SIGTERM'))
	process.on('SIGHUP', () => stop('SIGHUP'))
	process.on('exit', () => {
		if (!child.killed) child.kill('SIGKILL')
	})

	child.once('error', (error) => {
		console.error(error)
		process.exit(1)
	})
	child.once('exit', (code, signal) => {
		process.exit(signal ? 1 : (code ?? 0))
	})
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error)
		process.exit(1)
	})
}
