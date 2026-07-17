import { UnknownRecord } from '@tldraw/store'
import { describe, expect, it, vi } from 'vitest'
import { TLSocketServerSentEvent } from './protocol'
import { ServerSocketAdapter, WebSocketMinimal } from './ServerSocketAdapter'

class MockWebSocket implements WebSocketMinimal {
	readyState = 1 // OPEN
	send = vi.fn()
	close = vi.fn()
}

const pongMessage: TLSocketServerSentEvent<UnknownRecord> = { type: 'pong' }

describe('ServerSocketAdapter', () => {
	it('[SA1] isOpen is true exactly when the wrapped socket readyState is 1', () => {
		const ws = new MockWebSocket()
		const adapter = new ServerSocketAdapter({ ws })

		ws.readyState = 0 // CONNECTING
		expect(adapter.isOpen).toBe(false)
		ws.readyState = 1 // OPEN
		expect(adapter.isOpen).toBe(true)
		ws.readyState = 2 // CLOSING
		expect(adapter.isOpen).toBe(false)
		ws.readyState = 3 // CLOSED
		expect(adapter.isOpen).toBe(false)
	})

	it('[SA2] sendMessage JSON-stringifies the message and sends it', () => {
		const ws = new MockWebSocket()
		const adapter = new ServerSocketAdapter({ ws })

		const message: TLSocketServerSentEvent<UnknownRecord> = {
			type: 'connect',
			hydrationType: 'wipe_all',
			connectRequestId: 'test-request-123',
			protocolVersion: 1,
			schema: { schemaVersion: 1, storeVersion: 0, recordVersions: {} },
			diff: {},
			serverClock: 0,
			isReadonly: false,
		}

		adapter.sendMessage(message)

		expect(ws.send).toHaveBeenCalledTimes(1)
		expect(ws.send).toHaveBeenCalledWith(JSON.stringify(message))
	})

	it('[SA2] sendMessage invokes onBeforeSendMessage with the message and its stringified form before sending', () => {
		const ws = new MockWebSocket()
		const callOrder: string[] = []
		const onBeforeSendMessage = vi.fn(() => {
			callOrder.push('callback')
		})
		ws.send.mockImplementation(() => {
			callOrder.push('send')
		})
		const adapter = new ServerSocketAdapter({ ws, onBeforeSendMessage })

		adapter.sendMessage(pongMessage)

		expect(onBeforeSendMessage).toHaveBeenCalledTimes(1)
		expect(onBeforeSendMessage).toHaveBeenCalledWith(pongMessage, JSON.stringify(pongMessage))
		expect(ws.send).toHaveBeenCalledTimes(1)
		expect(callOrder).toEqual(['callback', 'send'])
	})

	it('[SA3] close passes through to the wrapped socket without arguments', () => {
		const ws = new MockWebSocket()
		const adapter = new ServerSocketAdapter({ ws })

		adapter.close()

		expect(ws.close).toHaveBeenCalledTimes(1)
		expect(ws.close).toHaveBeenCalledWith(undefined, undefined)
	})

	it('[SA3] close passes through the code and reason to the wrapped socket', () => {
		const ws = new MockWebSocket()
		const adapter = new ServerSocketAdapter({ ws })

		adapter.close(1000)
		expect(ws.close).toHaveBeenLastCalledWith(1000, undefined)

		adapter.close(1001, 'Going away')
		expect(ws.close).toHaveBeenLastCalledWith(1001, 'Going away')
	})
})
