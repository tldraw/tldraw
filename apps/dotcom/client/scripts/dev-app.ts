import { createServer } from 'net'
import { pathToFileURL } from 'url'
import { exec } from '../../../../internal/scripts/lib/exec'

const CLIENT_PORT = 3000
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

	if (process.env.VITE_PREVIEW === '1') {
		await exec('vite', getViteArgs('preview'))
	} else {
		await exec('vite', getViteArgs('dev'))
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error)
		process.exit(1)
	})
}
