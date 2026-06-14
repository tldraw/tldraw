import { createServer, type Server } from 'net'
import { afterEach, describe, expect, it } from 'vitest'
import { assertPortFree, getViteArgs } from './dev-app'

let server: Server | null = null

afterEach(async () => {
	if (!server) return
	await new Promise<void>((resolve) => server!.close(() => resolve()))
	server = null
})

function listenOnRandomPort(host: string) {
	return new Promise<number>((resolve, reject) => {
		server = createServer()
		server.once('error', reject)
		server.listen(0, host, () => {
			const address = server!.address()
			if (!address || typeof address === 'string') {
				reject(new Error('Expected a TCP address'))
				return
			}
			resolve(address.port)
		})
	})
}

describe('dev-app script', () => {
	it('passes strict port args to Vite', () => {
		expect(getViteArgs('dev')).toEqual(['dev', '--host', '--port', '3000', '--strictPort'])
		expect(getViteArgs('preview')).toEqual(['preview', '--host', '--port', '3000', '--strictPort'])
	})

	it('rejects when the requested port is already occupied', async () => {
		const port = await listenOnRandomPort('0.0.0.0')

		await expect(assertPortFree(port, ['0.0.0.0'])).rejects.toThrow(
			`Port ${port} is already in use`
		)
	})
})
