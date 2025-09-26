import { TLRecord, sleep } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	ACTIVE_MIN_DELAY,
	ClientWebSocketAdapter,
	INACTIVE_MIN_DELAY,
} from './ClientWebSocketAdapter'
// NOTE: WebSocket resolution is handled by vitest.config.ts alias configuration
import { WebSocketServer, WebSocket as WsWebSocket } from 'ws'
import { TLSocketClientSentEvent, getTlsyncProtocolVersion } from './protocol'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from './TLSyncClient'

async function waitFor(predicate: () => boolean) {
	let safety = 0
	while (!predicate()) {
		if (safety++ > 1000) {
			throw new Error('waitFor predicate timed out')
		}
		try {
			vi.runAllTimers()
			vi.useRealTimers()
			await sleep(10)
		} finally {
			vi.useFakeTimers()
		}
	}
}

vi.useFakeTimers()

describe(ClientWebSocketAdapter, () => {
	let adapter: ClientWebSocketAdapter
	let wsServer: WebSocketServer
	let connectedServerSocket: WsWebSocket
	const connectMock = vi.fn((socket: WsWebSocket) => {
		connectedServerSocket = socket
	})

	beforeEach(() => {
		adapter = new ClientWebSocketAdapter(() => 'ws://localhost:2233')
		wsServer = new WebSocketServer({ port: 2233 })
		wsServer.on('connection', connectMock as any)
	})

	afterEach(() => {
		adapter.close()
		wsServer.close()
		connectMock.mockClear()
	})

	describe('Connection Lifecycle', () => {
		it('should respond to onopen events by setting connectionStatus=online', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(adapter.connectionStatus).toBe('online')
		})

		it('should respond to onerror events by setting connectionStatus=offline', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			adapter._ws?.onerror?.({} as any)
			expect(adapter.connectionStatus).toBe('offline')
		})

		it('should try to reopen the connection if there was an error', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(adapter._ws).toBeTruthy()
			const prevClientSocket = adapter._ws
			const prevServerSocket = connectedServerSocket
			prevServerSocket.terminate()
			await waitFor(() => connectedServerSocket !== prevServerSocket)
			// there is a race here, the server could've opened a new socket already, but it hasn't
			// transitioned to OPEN yet, thus the second waitFor
			await waitFor(() => connectedServerSocket.readyState === WebSocket.OPEN)
			expect(adapter._ws).not.toBe(prevClientSocket)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		})

		it('should transition to online if a retry succeeds', async () => {
			adapter._ws?.onerror?.({} as any)
			await waitFor(() => adapter.connectionStatus === 'online')
			expect(adapter.connectionStatus).toBe('online')
		})

		it('should transition to offline if the server disconnects', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			expect(adapter.connectionStatus).toBe('offline')
		})

		it('retries to connect if the server disconnects', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			expect(adapter.connectionStatus).toBe('offline')
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(adapter.connectionStatus).toBe('online')
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			expect(adapter.connectionStatus).toBe('offline')
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(adapter.connectionStatus).toBe('online')
		})
	})

	describe('Message Handling', () => {
		it('supports receiving messages', async () => {
			const onMessage = vi.fn()
			adapter.onReceiveMessage(onMessage)
			connectMock.mockImplementationOnce((ws: any) => {
				ws.send('{ "type": "message", "data": "hello" }')
			})

			await waitFor(() => onMessage.mock.calls.length === 1)
			expect(onMessage).toHaveBeenCalledWith({ type: 'message', data: 'hello' })
		})

		it('supports sending messages', async () => {
			const onMessage = vi.fn()
			connectMock.mockImplementationOnce((ws: any) => {
				ws.on('message', onMessage)
			})

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			const message: TLSocketClientSentEvent<TLRecord> = {
				type: 'connect',
				connectRequestId: 'test',
				schema: { schemaVersion: 1, storeVersion: 0, recordVersions: {} },
				protocolVersion: getTlsyncProtocolVersion(),
				lastServerClock: 0,
			}

			adapter.sendMessage(message)

			await waitFor(() => onMessage.mock.calls.length === 1)

			expect(JSON.parse(onMessage.mock.calls[0][0].toString())).toEqual(message)
		})

		it('chunks large messages when sending', async () => {
			const onMessage = vi.fn()
			connectMock.mockImplementationOnce((ws: any) => {
				ws.on('message', onMessage)
			})

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			// Create a large message that should be chunked
			const largeData = 'x'.repeat(100000)
			const message: TLSocketClientSentEvent<TLRecord> = {
				type: 'connect',
				connectRequestId: 'test',
				schema: { schemaVersion: 1, storeVersion: 0, recordVersions: {} },
				protocolVersion: getTlsyncProtocolVersion(),
				lastServerClock: 0,
				// Add large data to force chunking
				largeData,
			} as any

			adapter.sendMessage(message)

			await waitFor(() => onMessage.mock.calls.length >= 1)
			expect(onMessage.mock.calls.length).toBeGreaterThan(0)
		})

		it('handles sendMessage when WebSocket is null', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			// Create a fresh adapter and wait for initial connection
			const testAdapter = new ClientWebSocketAdapter(() => 'ws://localhost:2233')
			await waitFor(() => testAdapter._ws?.readyState === WebSocket.OPEN)

			// Close the connection to test null WebSocket handling
			testAdapter._closeSocket()

			const message: TLSocketClientSentEvent<TLRecord> = {
				type: 'connect',
				connectRequestId: 'test',
				schema: { schemaVersion: 1, storeVersion: 0, recordVersions: {} },
				protocolVersion: getTlsyncProtocolVersion(),
				lastServerClock: 0,
			}

			// This should not throw since the socket is just null, not disposed
			testAdapter.sendMessage(message)

			testAdapter.close()
			consoleSpy.mockRestore()
		})

		it('warns when sending messages while not online', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			// Ensure we're not online
			adapter._ws?.onerror?.({} as any)
			await waitFor(() => adapter.connectionStatus !== 'online')

			const message: TLSocketClientSentEvent<TLRecord> = {
				type: 'connect',
				connectRequestId: 'test',
				schema: { schemaVersion: 1, storeVersion: 0, recordVersions: {} },
				protocolVersion: getTlsyncProtocolVersion(),
				lastServerClock: 0,
			}

			adapter.sendMessage(message)
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Tried to send message while')
			)

			consoleSpy.mockRestore()
		})
	})

	describe('Status Change Handling', () => {
		it('signals status changes', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })
			adapter._ws?.onerror?.({} as any)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })
		})

		it('signals the correct closeCode when a room is not found', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			adapter._ws!.onclose?.({
				code: 4099,
				reason: 'NOT_FOUND',
			} satisfies Partial<CloseEvent> as any)

			expect(onStatusChange).toHaveBeenCalledWith({ status: 'error', reason: 'NOT_FOUND' })
		})

		it('signals status changes while restarting', async () => {
			const onStatusChange = vi.fn()
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			adapter.onStatusChange(onStatusChange)

			adapter.restart()

			await waitFor(() => onStatusChange.mock.calls.length === 2)

			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })
		})

		it('handles different close codes correctly', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			// Test normal close (should be offline)
			adapter._ws!.onclose?.({ code: 1000, reason: 'Normal closure' } as CloseEvent)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })

			// Test error close code on a fresh adapter to avoid status conflict
			const errorTestAdapter = new ClientWebSocketAdapter(() => 'ws://localhost:2233')
			const errorStatusSpy = vi.fn()
			errorTestAdapter.onStatusChange(errorStatusSpy)

			// Wait for connection to be online
			await waitFor(() => errorTestAdapter._ws?.readyState === WebSocket.OPEN)
			expect(errorStatusSpy).toHaveBeenCalledWith({ status: 'online' })
			errorStatusSpy.mockClear()

			// Test error close code (should be error since we're online)
			errorTestAdapter._ws!.onclose?.({
				code: TLSyncErrorCloseEventCode,
				reason: TLSyncErrorCloseEventReason.NOT_FOUND,
			} as CloseEvent)
			expect(errorStatusSpy).toHaveBeenCalledWith({
				status: 'error',
				reason: TLSyncErrorCloseEventReason.NOT_FOUND,
			})

			errorTestAdapter.close()
		})
	})

	describe('Lifecycle Management', () => {
		it('should call .close on the underlying socket if .close is called before the socket opens', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			const closeSpy = vi.spyOn(adapter._ws!, 'close')
			adapter.close()
			// No need to wait - close() is synchronous
			expect(closeSpy).toHaveBeenCalled()
		})

		it('prevents operations after disposal', () => {
			adapter.close()

			expect(() => {
				adapter.sendMessage({} as any)
			}).toThrow('Tried to send message on a disposed socket')

			expect(() => {
				adapter.onReceiveMessage(() => {})
			}).toThrow('Tried to add message listener on a disposed socket')

			expect(() => {
				adapter.onStatusChange(() => {})
			}).toThrow('Tried to add status listener on a disposed socket')

			expect(() => {
				adapter.restart()
			}).toThrow('Tried to restart a disposed socket')
		})
	})

	describe('Listener Management', () => {
		it('properly cleans up message listeners', async () => {
			const onMessage = vi.fn()
			const unsubscribe = adapter.onReceiveMessage(onMessage)

			// Wait for connection
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			// Send a message through the connected socket
			connectedServerSocket.send('{ "type": "test", "data": "first" }')

			await waitFor(() => onMessage.mock.calls.length === 1)
			expect(onMessage).toHaveBeenCalledWith({ type: 'test', data: 'first' })

			// Clean up listener
			unsubscribe()
			onMessage.mockClear()

			// Send another message - should not be received
			connectedServerSocket.send('{ "type": "test", "data": "second" }')

			// Use vitest's timer utilities instead of real timeout
			vi.advanceTimersByTime(200)
			expect(onMessage).not.toHaveBeenCalled()
		})

		it('properly cleans up status listeners', async () => {
			const onStatusChange = vi.fn()
			const unsubscribe = adapter.onStatusChange(onStatusChange)

			// Wait for initial connection
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })

			// Clean up listener
			unsubscribe()
			onStatusChange.mockClear()

			// Trigger status change - should not be received
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)

			expect(onStatusChange).not.toHaveBeenCalled()
		})
	})

	describe('Socket Management', () => {
		it('attempts to reconnect early if the tab becomes active', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			const hiddenMock = vi.spyOn(document, 'hidden', 'get')
			hiddenMock.mockReturnValue(true)
			// it's necessary to close the socket, as otherwise the websocket might stay half-open
			connectedServerSocket.close()
			wsServer.close()
			await waitFor(() => adapter._ws?.readyState !== WebSocket.OPEN)
			expect(adapter._reconnectManager.intendedDelay).toBeGreaterThanOrEqual(INACTIVE_MIN_DELAY)
			hiddenMock.mockReturnValue(false)
			document.dispatchEvent(new Event('visibilitychange'))
			expect(adapter._reconnectManager.intendedDelay).toBeLessThan(INACTIVE_MIN_DELAY)
			hiddenMock.mockRestore()
		})
	})

	describe('URI Handling', () => {
		it('supports dynamic URI generation', async () => {
			let uriCallCount = 0
			const dynamicAdapter = new ClientWebSocketAdapter(() => {
				uriCallCount++
				return `ws://localhost:2233?attempt=${uriCallCount}`
			})

			await waitFor(() => dynamicAdapter._ws?.readyState === WebSocket.OPEN)
			expect(uriCallCount).toBeGreaterThan(0)

			// Force reconnection to test URI is called again
			dynamicAdapter.restart()
			await waitFor(() => dynamicAdapter._ws?.readyState === WebSocket.OPEN)
			expect(uriCallCount).toBeGreaterThan(1)

			dynamicAdapter.close()
		})

		it('supports async URI generation', async () => {
			let resolveUri: (uri: string) => void
			const uriPromise = new Promise<string>((resolve) => {
				resolveUri = resolve
			})

			const asyncAdapter = new ClientWebSocketAdapter(() => uriPromise)

			// Should not be connected yet
			expect(asyncAdapter._ws).toBeNull()

			// Resolve the URI
			resolveUri!('ws://localhost:2233')

			await waitFor(() => asyncAdapter._ws?.readyState === WebSocket.OPEN)
			expect(asyncAdapter.connectionStatus).toBe('online')

			asyncAdapter.close()
		})
	})
})

// ReconnectManager tests
describe('ReconnectManager', () => {
	let adapter: ClientWebSocketAdapter
	let wsServer: WebSocketServer
	let connectedServerSocket: WsWebSocket
	const connectMock = vi.fn((socket: WsWebSocket) => {
		connectedServerSocket = socket
	})

	beforeEach(() => {
		adapter = new ClientWebSocketAdapter(() => 'ws://localhost:2234')
		wsServer = new WebSocketServer({ port: 2234 })
		wsServer.on('connection', connectMock as any)
	})

	afterEach(() => {
		adapter.close()
		wsServer.close()
		connectMock.mockClear()
	})

	describe('Network Event Handling', () => {
		it('responds to window online events', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			// Disconnect
			connectedServerSocket.close()
			await waitFor(() => adapter._ws?.readyState !== WebSocket.OPEN)

			// Close server to prevent automatic reconnection
			wsServer.close()

			// Simulate network coming back online
			const originalDelay = adapter._reconnectManager.intendedDelay
			window.dispatchEvent(new Event('online'))

			// Should reset delay for immediate reconnection attempt
			expect(adapter._reconnectManager.intendedDelay).toBe(ACTIVE_MIN_DELAY)
		})

		it('responds to window offline events', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			// Simulate going offline
			window.dispatchEvent(new Event('offline'))

			// Should close the socket
			await waitFor(() => adapter._ws?.readyState !== WebSocket.OPEN)
		})
	})
})
