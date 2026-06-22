import { warnOnce } from '@tldraw/utils'
import { TLRecord, sleep } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// spy on warnOnce so the CW5 warning can be observed deterministically: the real
// warnOnce dedupes globally, so incidental 1006 closes elsewhere in the suite would
// otherwise consume the one-time warning before the test that asserts it runs
vi.mock('@tldraw/utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tldraw/utils')>()
	return { ...actual, warnOnce: vi.fn(actual.warnOnce) }
})
// NOTE: setupVitest.js replaces the global WebSocket with the 'ws' package's WebSocket,
// matching the WebSocketServer the tests connect to.
import { WebSocketServer, WebSocket as WsWebSocket } from 'ws'
import {
	ACTIVE_MAX_DELAY,
	ACTIVE_MIN_DELAY,
	ATTEMPT_TIMEOUT,
	ClientWebSocketAdapter,
	DELAY_EXPONENT,
	INACTIVE_MAX_DELAY,
	INACTIVE_MIN_DELAY,
} from './ClientWebSocketAdapter'
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

// A minimal fake socket that satisfies the parts of the WebSocket interface
// that ClientWebSocketAdapter._setNewSocket touches.
function mockSocket(readyState: number = WebSocket.CONNECTING) {
	return {
		readyState,
		onopen: null,
		onclose: null,
		onerror: null,
		onmessage: null,
		close: vi.fn(),
	} as any
}

function connectMessage(): TLSocketClientSentEvent<TLRecord> {
	return {
		type: 'connect',
		connectRequestId: 'test',
		schema: { schemaVersion: 1, storeVersion: 0, recordVersions: {} },
		protocolVersion: getTlsyncProtocolVersion(),
		lastServerClock: 0,
	}
}

vi.useFakeTimers()

describe('ClientWebSocketAdapter', () => {
	let adapter: ClientWebSocketAdapter
	let wsServer: WebSocketServer
	let connectedServerSocket: WsWebSocket
	const connectMock = vi.fn((socket: WsWebSocket) => {
		connectedServerSocket = socket
	})

	let consoleWarnSpy: ReturnType<typeof vi.spyOn>
	beforeEach(() => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		adapter = new ClientWebSocketAdapter(() => 'ws://localhost:2233')
		wsServer = new WebSocketServer({ port: 2233 })
		wsServer.on('connection', connectMock as any)
	})

	afterEach(() => {
		consoleWarnSpy.mockRestore()
		adapter.close()
		wsServer.close()
		connectMock.mockClear()
	})

	describe('connection and initial state (CW1, CW2)', () => {
		it('[CW2] starts with connectionStatus offline while the internal status is initial', () => {
			const newAdapter = new ClientWebSocketAdapter(() => 'ws://localhost:2233')
			try {
				expect(newAdapter._connectionStatus.get()).toBe('initial')
				expect(newAdapter.connectionStatus).toBe('offline')
			} finally {
				newAdapter.close()
			}
		})

		it('[CW2] becomes online when the socket opens and notifies status listeners', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			expect(adapter.connectionStatus).toBe('online')
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })
		})

		it('[CW1] connects using the URI returned by getUri and re-invokes it for every attempt', async () => {
			let uriCallCount = 0
			const dynamicAdapter = new ClientWebSocketAdapter(() => {
				uriCallCount++
				return `ws://localhost:2233?attempt=${uriCallCount}`
			})
			try {
				await waitFor(() => dynamicAdapter._ws?.readyState === WebSocket.OPEN)
				expect(uriCallCount).toBeGreaterThanOrEqual(1)
				const countAfterFirstConnect = uriCallCount

				// force a reconnection: getUri must be consulted again (e.g. for fresh auth tokens)
				dynamicAdapter.restart()
				await waitFor(
					() =>
						dynamicAdapter._ws?.readyState === WebSocket.OPEN &&
						uriCallCount > countAfterFirstConnect
				)
				expect(uriCallCount).toBeGreaterThan(countAfterFirstConnect)
			} finally {
				dynamicAdapter.close()
			}
		})

		it('[CW1] supports an async getUri', async () => {
			let resolveUri: (uri: string) => void
			const uriPromise = new Promise<string>((resolve) => {
				resolveUri = resolve
			})
			const asyncAdapter = new ClientWebSocketAdapter(() => uriPromise)
			try {
				// no socket can be created until the promise resolves
				expect(asyncAdapter._ws).toBeNull()

				resolveUri!('ws://localhost:2233')

				await waitFor(() => asyncAdapter._ws?.readyState === WebSocket.OPEN)
				expect(asyncAdapter.connectionStatus).toBe('online')
			} finally {
				asyncAdapter.close()
			}
		})
	})

	describe('close codes and status changes (CW3, CW4, CW5)', () => {
		it('[CW3] a close with code 4099 produces status error carrying the close reason', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			adapter._ws!.onclose?.({
				code: TLSyncErrorCloseEventCode,
				reason: TLSyncErrorCloseEventReason.NOT_FOUND,
			} satisfies Partial<CloseEvent> as any)

			expect(onStatusChange).toHaveBeenCalledWith({
				status: 'error',
				reason: TLSyncErrorCloseEventReason.NOT_FOUND,
			})
			expect(adapter.connectionStatus).toBe('error')
		})

		it('[CW3] a close with code 4099 and an empty reason reports UNKNOWN_ERROR', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			adapter._ws!.onclose?.({
				code: TLSyncErrorCloseEventCode,
				reason: '',
			} satisfies Partial<CloseEvent> as any)

			expect(onStatusChange).toHaveBeenCalledWith({
				status: 'error',
				reason: TLSyncErrorCloseEventReason.UNKNOWN_ERROR,
			})
		})

		it('[CW3] a close with any other code produces offline', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			adapter._ws!.onclose?.({
				code: 1000,
				reason: 'Normal closure',
			} satisfies Partial<CloseEvent> as any)

			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })
			expect(adapter.connectionStatus).toBe('offline')
		})

		it('[CW3] a socket error produces offline', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			adapter._ws?.onerror?.({} as any)
			expect(adapter.connectionStatus).toBe('offline')
		})

		it('[CW3] the server dropping the connection produces offline', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			expect(adapter.connectionStatus).toBe('offline')
		})

		it('[CW2][CW3] notifies status listeners across repeated connection cycles', async () => {
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

		it('[CW4] does not re-notify listeners when the status does not change', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })
			onStatusChange.mockClear()

			// a second disconnect-flavoured event while already offline is not re-notified
			adapter._ws!.onerror?.({} as any)

			expect(onStatusChange).not.toHaveBeenCalled()
			expect(adapter.connectionStatus).toBe('offline')
		})

		it('[CW4] suppresses an error close that arrives while already offline', async () => {
			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
			onStatusChange.mockClear()

			adapter._ws!.onclose?.({
				code: TLSyncErrorCloseEventCode,
				reason: TLSyncErrorCloseEventReason.NOT_FOUND,
			} satisfies Partial<CloseEvent> as any)

			expect(onStatusChange).not.toHaveBeenCalled()
			expect(adapter.connectionStatus).toBe('offline')
		})

		it('[CW5] a close with code 1006 on a socket that never opened logs a one-time warning', async () => {
			const warnOnceMock = vi.mocked(warnOnce)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			adapter._closeSocket()
			warnOnceMock.mockClear()

			const fake = mockSocket()
			adapter._setNewSocket(fake)
			fake.onclose?.({ code: 1006, reason: '' })

			// the warning goes through warnOnce, which dedupes it for the app's lifetime
			expect(warnOnceMock).toHaveBeenCalledTimes(1)
			expect(warnOnceMock).toHaveBeenCalledWith(
				expect.stringContaining('Could not open WebSocket connection')
			)
		})

		it('[CW5] a close with code 1006 on a socket that did open does not warn', async () => {
			const warnOnceMock = vi.mocked(warnOnce)
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			warnOnceMock.mockClear()

			adapter._ws!.onclose?.({ code: 1006, reason: '' } satisfies Partial<CloseEvent> as any)

			expect(warnOnceMock).not.toHaveBeenCalled()
		})
	})

	describe('URI conversion (CW1)', () => {
		it('[CW1] converts http URIs to ws and connects', async () => {
			const httpAdapter = new ClientWebSocketAdapter(() => 'http://localhost:2233')
			try {
				await waitFor(() => httpAdapter._ws?.readyState === WebSocket.OPEN)
				expect(httpAdapter._ws!.url).toMatch(/^ws:\/\//)
				expect(httpAdapter.connectionStatus).toBe('online')
			} finally {
				httpAdapter.close()
			}
		})

		it('[CW1] converts https URIs to wss', async () => {
			const httpsAdapter = new ClientWebSocketAdapter(() => 'https://localhost:2233')
			try {
				await waitFor(() => httpsAdapter._ws !== null)
				expect(httpsAdapter._ws!.url).toMatch(/^wss:\/\//)
			} finally {
				httpsAdapter.close()
			}
		})
	})

	describe('sending messages (CW6)', () => {
		it('[CW6] JSON-stringifies and sends messages when online', async () => {
			const onMessage = vi.fn()
			connectMock.mockImplementationOnce((ws: any) => {
				ws.on('message', onMessage)
			})

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			const message = connectMessage()
			adapter.sendMessage(message)

			await waitFor(() => onMessage.mock.calls.length === 1)

			expect(JSON.parse(onMessage.mock.calls[0][0].toString())).toEqual(message)
		})

		it('[CW6] chunks large messages when sending', async () => {
			const onMessage = vi.fn()
			connectMock.mockImplementationOnce((ws: any) => {
				ws.on('message', onMessage)
			})

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			// large enough to exceed the default max chunk size (256k chars)
			const message = { ...connectMessage(), largeData: 'x'.repeat(300000) } as any
			adapter.sendMessage(message)

			const getParts = () => onMessage.mock.calls.map((call) => call[0].toString())
			const reassemble = (parts: string[]) => parts.map((p) => p.replace(/^\d+_/, '')).join('')
			await waitFor(() => {
				const parts = getParts()
				if (parts.length < 2) return false
				try {
					JSON.parse(reassemble(parts))
					return true
				} catch {
					return false
				}
			})

			const parts = getParts()
			expect(parts.length).toBeGreaterThan(1)
			// each chunk carries the <n>_ countdown prefix
			expect(parts[0]).toMatch(/^\d+_/)
			expect(JSON.parse(reassemble(parts))).toEqual(message)
		})

		it('[CW6] warns and drops the message when the socket exists but is not online', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			// synthetic close: the adapter goes offline but keeps its socket reference
			adapter._ws!.onclose?.({ code: 1000, reason: '' } satisfies Partial<CloseEvent> as any)
			expect(adapter.connectionStatus).toBe('offline')
			consoleWarnSpy.mockClear()

			adapter.sendMessage(connectMessage())

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Tried to send message while')
			)
		})

		it('[CW6] silently drops the message when there is no socket', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			adapter._closeSocket()
			expect(adapter._ws).toBeNull()
			consoleWarnSpy.mockClear()

			expect(() => adapter.sendMessage(connectMessage())).not.toThrow()
			expect(consoleWarnSpy).not.toHaveBeenCalled()
		})
	})

	describe('receiving messages (CW7)', () => {
		it('[CW7] parses incoming JSON and forwards it to message listeners', async () => {
			const onMessage = vi.fn()
			adapter.onReceiveMessage(onMessage)
			connectMock.mockImplementationOnce((ws: any) => {
				ws.send('{ "type": "message", "data": "hello" }')
			})

			await waitFor(() => onMessage.mock.calls.length === 1)
			expect(onMessage).toHaveBeenCalledWith({ type: 'message', data: 'hello' })
		})

		it('[CW7] restarts the connection on a malformed JSON message instead of forwarding it', async () => {
			const warnOnceMock = vi.mocked(warnOnce)
			const onMessage = vi.fn()
			const onStatusChange = vi.fn()
			adapter.onReceiveMessage(onMessage)
			adapter.onStatusChange(onStatusChange)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			const prevWs = adapter._ws
			warnOnceMock.mockClear()

			connectedServerSocket.send('{ "type": "message",')

			// the malformed message is never forwarded to listeners, and the connection restarts so
			// the client re-hydrates from the last known server clock rather than silently desyncing
			await waitFor(() => adapter._ws !== prevWs && adapter._ws?.readyState === WebSocket.OPEN)
			expect(onMessage).not.toHaveBeenCalled()
			expect(warnOnceMock).toHaveBeenCalledWith(
				'Received malformed WebSocket message. Restarting the connection.'
			)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'offline' })
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })
			expect(adapter.connectionStatus).toBe('online')
		})

		it('[CW7] stops delivering messages after unsubscribe', async () => {
			const onMessage = vi.fn()
			const unsubscribe = adapter.onReceiveMessage(onMessage)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			connectedServerSocket.send('{ "type": "test", "data": "first" }')
			await waitFor(() => onMessage.mock.calls.length === 1)
			expect(onMessage).toHaveBeenCalledWith({ type: 'test', data: 'first' })

			unsubscribe()
			onMessage.mockClear()

			connectedServerSocket.send('{ "type": "test", "data": "second" }')
			vi.advanceTimersByTime(200)
			expect(onMessage).not.toHaveBeenCalled()
		})

		it('[CW2] stops notifying status listeners after unsubscribe', async () => {
			const onStatusChange = vi.fn()
			const unsubscribe = adapter.onStatusChange(onStatusChange)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			expect(onStatusChange).toHaveBeenCalledWith({ status: 'online' })

			unsubscribe()
			onStatusChange.mockClear()

			connectedServerSocket.terminate()
			await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)

			expect(onStatusChange).not.toHaveBeenCalled()
		})
	})

	describe('restart (CW8)', () => {
		it('[CW8] restart closes the current socket and reconnects, notifying offline then online', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			const prevWs = adapter._ws

			const onStatusChange = vi.fn()
			adapter.onStatusChange(onStatusChange)

			adapter.restart()

			await waitFor(() => onStatusChange.mock.calls.length === 2)

			expect(onStatusChange.mock.calls[0][0]).toEqual({ status: 'offline' })
			expect(onStatusChange.mock.calls[1][0]).toEqual({ status: 'online' })
			expect(adapter._ws).not.toBe(prevWs)
		})
	})

	describe('disposal (CW9)', () => {
		it('[CW9] close closes the underlying socket', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			const closeSpy = vi.spyOn(adapter._ws!, 'close')
			adapter.close()
			expect(closeSpy).toHaveBeenCalled()
		})

		it('[CW6][CW9] sendMessage, restart, and listener registration throw after close', () => {
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

		it('[CW9] close is idempotent', async () => {
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			adapter.close()
			expect(() => adapter.close()).not.toThrow()
		})
	})

	describe('orphaned sockets (CW10)', () => {
		it('[CW10] ignores events from orphaned sockets', async () => {
			const onStatusChange = vi.fn()
			const onMessage = vi.fn()
			adapter.onStatusChange(onStatusChange)
			adapter.onReceiveMessage(onMessage)

			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
			const originalSocket = adapter._ws!

			// create a new connection, orphaning the old socket
			adapter._closeSocket()
			await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

			onStatusChange.mockClear()
			onMessage.mockClear()

			// events on the orphaned socket must not change the adapter's status
			originalSocket.onclose?.({ code: 1000, reason: 'test' } as CloseEvent)
			originalSocket.onerror?.({} as Event)
			// (onmessage on an orphaned socket asserts by design, so it is not triggered here)

			expect(onStatusChange).not.toHaveBeenCalled()
			expect(onMessage).not.toHaveBeenCalled()
			expect(adapter.connectionStatus).toBe('online')
		})
	})
})

describe('ReconnectManager', () => {
	let adapter: ClientWebSocketAdapter
	let wsServer: WebSocketServer
	let connectedServerSocket: WsWebSocket
	const connectMock = vi.fn((socket: WsWebSocket) => {
		connectedServerSocket = socket
	})

	let consoleWarnSpy: ReturnType<typeof vi.spyOn>
	beforeEach(() => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		adapter = new ClientWebSocketAdapter(() => 'ws://localhost:2234')
		wsServer = new WebSocketServer({ port: 2234 })
		wsServer.on('connection', connectMock as any)
	})

	afterEach(() => {
		consoleWarnSpy.mockRestore()
		adapter.close()
		wsServer.close()
		connectMock.mockClear()
	})

	it('[RM1] exposes the documented delay constants', () => {
		expect(ACTIVE_MIN_DELAY).toBe(500)
		expect(ACTIVE_MAX_DELAY).toBe(2000)
		expect(INACTIVE_MIN_DELAY).toBe(1000)
		expect(INACTIVE_MAX_DELAY).toBe(1000 * 60 * 5)
		expect(DELAY_EXPONENT).toBe(1.5)
		expect(ATTEMPT_TIMEOUT).toBe(1000)
	})

	it('[RM1] reconnection delays back off exponentially, bounded by the active delays', () => {
		const testAdapter = new ClientWebSocketAdapter(() => 'ws://localhost:2234')
		try {
			const manager = testAdapter._reconnectManager
			// make every disconnected() call take the "attempt now" branch
			;(manager as any).lastAttemptStart = Date.now() - 1_000_000
			manager.intendedDelay = ACTIVE_MIN_DELAY

			manager.disconnected()
			expect(manager.intendedDelay).toBe(ACTIVE_MIN_DELAY * DELAY_EXPONENT)
			manager.disconnected()
			expect(manager.intendedDelay).toBe(ACTIVE_MIN_DELAY * DELAY_EXPONENT ** 2)
			manager.disconnected()
			expect(manager.intendedDelay).toBe(ACTIVE_MIN_DELAY * DELAY_EXPONENT ** 3)
			// capped at the active maximum
			manager.disconnected()
			expect(manager.intendedDelay).toBe(ACTIVE_MAX_DELAY)
			manager.disconnected()
			expect(manager.intendedDelay).toBe(ACTIVE_MAX_DELAY)
		} finally {
			testAdapter.close()
		}
	})

	it('[RM1] uses the inactive delay bounds when the tab is hidden', () => {
		const hiddenMock = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
		const testAdapter = new ClientWebSocketAdapter(() => 'ws://localhost:2234')
		try {
			const manager = testAdapter._reconnectManager
			;(manager as any).lastAttemptStart = Date.now() - 1_000_000

			// the delay is clamped up to the inactive minimum before applying the exponent
			manager.intendedDelay = 0
			manager.disconnected()
			expect(manager.intendedDelay).toBe(INACTIVE_MIN_DELAY * DELAY_EXPONENT)

			// and capped at the inactive maximum
			manager.intendedDelay = INACTIVE_MAX_DELAY
			manager.disconnected()
			expect(manager.intendedDelay).toBe(INACTIVE_MAX_DELAY)
		} finally {
			testAdapter.close()
			hiddenMock.mockRestore()
		}
	})

	it('[RM1][RM2] reconnects with a new socket after the server drops the connection, repeatedly', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		const prevClientSocket = adapter._ws
		const prevServerSocket = connectedServerSocket

		prevServerSocket.terminate()
		await waitFor(() => connectedServerSocket !== prevServerSocket)
		// there is a race here, the server could've opened a new socket already, but it hasn't
		// transitioned to OPEN yet, thus the second waitFor
		await waitFor(() => connectedServerSocket.readyState === WebSocket.OPEN)
		expect(adapter._ws).not.toBe(prevClientSocket)
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(adapter.connectionStatus).toBe('online')

		// and again
		connectedServerSocket.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(adapter.connectionStatus).toBe('offline')
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(adapter.connectionStatus).toBe('online')
	})

	it('[RM2] a successful connection resets the intended delay to the active minimum', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		const manager = adapter._reconnectManager

		// directly: connected() resets a backed-off delay
		manager.intendedDelay = ACTIVE_MAX_DELAY
		manager.connected()
		expect(manager.intendedDelay).toBe(ACTIVE_MIN_DELAY)

		// and through a real reconnect cycle
		manager.intendedDelay = ACTIVE_MAX_DELAY
		connectedServerSocket.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(manager.intendedDelay).toBe(ACTIVE_MIN_DELAY)
	})

	it('[RM3] the window offline event closes the active socket', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

		window.dispatchEvent(new Event('offline'))

		expect(adapter._ws).toBeNull()
		expect(adapter.connectionStatus).toBe('offline')
	})

	it('[RM4] the window online event resets the backoff for an immediate reconnect attempt', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

		connectedServerSocket.close()
		await waitFor(() => adapter._ws?.readyState !== WebSocket.OPEN)

		// close server to prevent an automatic reconnection winning the race
		wsServer.close()

		const manager = adapter._reconnectManager
		manager.intendedDelay = ACTIVE_MAX_DELAY
		// a recent attempt keeps maybeReconnected in the "honour the min delay" branch
		;(manager as any).lastAttemptStart = Date.now()

		window.dispatchEvent(new Event('online'))

		expect(manager.intendedDelay).toBe(ACTIVE_MIN_DELAY)
	})

	it('[RM1][RM4] the document becoming visible triggers an early reconnect attempt', async () => {
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

	it('[RM4] a socket that is already OPEN is left alone', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		const ws = adapter._ws
		const onStatusChange = vi.fn()
		adapter.onStatusChange(onStatusChange)

		adapter._reconnectManager.maybeReconnected()

		expect(adapter._ws).toBe(ws)
		expect(adapter._ws!.readyState).toBe(WebSocket.OPEN)
		expect(onStatusChange).not.toHaveBeenCalled()
	})

	it('[RM4] a socket CONNECTING for less than ATTEMPT_TIMEOUT is left alone and rechecked later', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		adapter._closeSocket()

		let now = Date.now()
		const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)
		try {
			const fake = mockSocket()
			adapter._setNewSocket(fake)
			;(adapter._reconnectManager as any).lastAttemptStart = now

			adapter._reconnectManager.maybeReconnected()

			// young attempt: the socket is left alone
			expect(fake.close).not.toHaveBeenCalled()
			expect(adapter._ws).toBe(fake)

			// when the recheck fires after ATTEMPT_TIMEOUT, the still-CONNECTING socket
			// is closed and a new attempt is made
			now += ATTEMPT_TIMEOUT + 100
			vi.advanceTimersByTime(ATTEMPT_TIMEOUT + 100)

			expect(fake.close).toHaveBeenCalled()
			expect(adapter._ws).toBeNull()
		} finally {
			dateSpy.mockRestore()
		}
	})

	it('[RM4] a socket stuck in CONNECTING for longer than ATTEMPT_TIMEOUT is closed and retried', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		adapter._closeSocket()

		const fake = mockSocket()
		adapter._setNewSocket(fake)
		;(adapter._reconnectManager as any).lastAttemptStart = Date.now() - ATTEMPT_TIMEOUT - 100

		adapter._reconnectManager.maybeReconnected()

		expect(fake.close).toHaveBeenCalled()
		expect(adapter._ws).toBeNull()
	})

	it('[RM5] close cancels timers and removes the reconnect event listeners', () => {
		const testAdapter = new ClientWebSocketAdapter(() => 'ws://localhost:2234')
		const manager = testAdapter._reconnectManager

		testAdapter.close()

		// with the listeners removed, reconnect hints no longer touch the manager
		manager.intendedDelay = 12345
		window.dispatchEvent(new Event('online'))
		document.dispatchEvent(new Event('visibilitychange'))
		window.dispatchEvent(new Event('offline'))
		expect(manager.intendedDelay).toBe(12345)
		expect(testAdapter._ws).toBeNull()

		// closing again is safe
		expect(() => manager.close()).not.toThrow()
	})
})
