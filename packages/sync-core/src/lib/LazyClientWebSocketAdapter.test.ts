import { sleep } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// NOTE: setupVitest.js replaces the global WebSocket with the 'ws' package's WebSocket,
// matching the WebSocketServer the tests connect to.
import { WebSocketServer } from 'ws'
import { LazyClientWebSocketAdapter } from './LazyClientWebSocketAdapter'

async function waitFor(predicate: () => boolean) {
	let safety = 0
	while (!predicate()) {
		if (safety++ > 1000) {
			throw new Error('waitFor predicate timed out')
		}
		await sleep(10)
	}
}

describe('LazyClientWebSocketAdapter', () => {
	let wsServer: WebSocketServer
	let adapter: LazyClientWebSocketAdapter
	let connections: number

	beforeEach(() => {
		connections = 0
		wsServer = new WebSocketServer({ port: 23456 })
		wsServer.on('connection', () => {
			connections++
		})
		adapter = new LazyClientWebSocketAdapter(() => 'ws://localhost:23456')
	})

	afterEach(() => {
		adapter.close()
		wsServer.close()
	})

	it('stays detached until connectNow: no connection, offline status, dial flag unset', async () => {
		expect(adapter.connectionStatus).toBe('offline')
		expect(adapter.didRequestConnect.get()).toBe(false)
		await sleep(50)
		expect(connections).toBe(0)
	})

	it('connectNow dials and forwards status events to listeners registered while detached', async () => {
		const statuses: string[] = []
		adapter.onStatusChange((event) => statuses.push(event.status))

		adapter.connectNow()
		expect(adapter.didRequestConnect.get()).toBe(true)

		await waitFor(() => adapter.connectionStatus === 'online')
		expect(connections).toBe(1)
		expect(statuses).toContain('online')
	})

	it('forwards messages received after dialing to listeners registered while detached', async () => {
		const received: any[] = []
		adapter.onReceiveMessage((msg) => received.push(msg))
		wsServer.on('connection', (ws) => {
			ws.send(JSON.stringify({ type: 'pong' }))
		})

		adapter.connectNow()
		await waitFor(() => received.length > 0)
		expect(received[0]).toEqual({ type: 'pong' })
	})

	it('connectNow is idempotent', async () => {
		adapter.connectNow()
		adapter.connectNow()
		await waitFor(() => adapter.connectionStatus === 'online')
		await sleep(50)
		expect(connections).toBe(1)
	})

	it('restart while detached dials; restart after dialing restarts the inner socket', async () => {
		adapter.restart()
		expect(adapter.didRequestConnect.get()).toBe(true)
		await waitFor(() => adapter.connectionStatus === 'online')
		expect(connections).toBe(1)

		adapter.restart()
		await waitFor(() => connections === 2)
	})

	it('close before dialing makes connectNow a no-op', async () => {
		adapter.close()
		adapter.connectNow()
		await sleep(50)
		expect(connections).toBe(0)
		expect(adapter.connectionStatus).toBe('offline')
	})

	it('removed listeners stop receiving events', async () => {
		const statuses: string[] = []
		const unsubscribe = adapter.onStatusChange((event) => statuses.push(event.status))
		unsubscribe()
		adapter.connectNow()
		await waitFor(() => adapter.connectionStatus === 'online')
		expect(statuses).toHaveLength(0)
	})
})

describe('LazyClientWebSocketAdapter (no server)', () => {
	it('does not construct a websocket before connectNow', async () => {
		const RealWebSocket = global.WebSocket
		const constructed = vi.fn()
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		global.WebSocket = class extends (RealWebSocket as any) {
			constructor(...args: any[]) {
				constructed(...args)
				super(...(args as [any]))
			}
		} as any
		try {
			const adapter = new LazyClientWebSocketAdapter(() => 'ws://localhost:9')
			await sleep(50)
			expect(constructed).not.toHaveBeenCalled()
			adapter.close()
		} finally {
			global.WebSocket = RealWebSocket
		}
	})
})
