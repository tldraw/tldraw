import { TLSocketClientSentEvent, getTlsyncProtocolVersion } from '@tldraw/tlsync'
import { TLRecord } from 'tldraw'
import { ClientWebSocketAdapter, INACTIVE_MIN_DELAY } from './ClientWebSocketAdapter'
// NOTE: there is a hack in apps/dotcom/jestResolver.js to make this import work
import { WebSocketServer, WebSocket as WsWebSocket } from 'ws'

async function waitFor(predicate: () => boolean) {
	let safety = 0
	while (!predicate()) {
		if (safety++ > 1000) {
			throw new Error('waitFor predicate timed out')
		}
		try {
			jest.runAllTimers()
			jest.useRealTimers()
			await new Promise((resolve) => setTimeout(resolve, 10))
		} finally {
			jest.useFakeTimers()
		}
	}
}

jest.useFakeTimers()

describe(ClientWebSocketAdapter, () => {
	let adapter: ClientWebSocketAdapter
	let wsServer: WebSocketServer
	let connectedServerSocket: WsWebSocket
	const connectMock = jest.fn<void, [socket: WsWebSocket]>((socket) => {
		connectedServerSocket = socket
	})
	beforeEach(() => {
		adapter = new ClientWebSocketAdapter(() => 'ws://localhost:2233')
		wsServer = new WebSocketServer({ port: 2233 })
		wsServer.on('connection', connectMock)
	})
	afterEach(() => {
		adapter.close()
		wsServer.close()
		connectMock.mockClear()
	})

	it('should be able to be constructed', () => {
		expect(adapter).toBeTruthy()
	})
	it('should start with connectionStatus=offline', () => {
		expect(adapter.connectionStatus).toBe('offline')
	})
	it('should start with connectionStatus=offline', () => {
		expect(adapter.connectionStatus).toBe('offline')
	})
	it('should respond to onopen events by setting connectionStatus=online', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(adapter.connectionStatus).toBe('online')
	})
	it('should respond to onerror events by setting connectionStatus=error', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		adapter._ws?.onerror?.({} as any)
		expect(adapter.connectionStatus).toBe('error')
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
		expect(adapter._ws?.readyState).toBe(WebSocket.OPEN)
	})
	it('should transition to online if a retry succeeds', async () => {
		adapter._ws?.onerror?.({} as any)
		await waitFor(() => adapter.connectionStatus === 'online')
		expect(adapter.connectionStatus).toBe('online')
	})
	it('should call .close on the underlying socket if .close is called before the socket opens', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		const closeSpy = jest.spyOn(adapter._ws!, 'close')
		adapter.close()
		await waitFor(() => closeSpy.mock.calls.length > 0)
		expect(closeSpy).toHaveBeenCalled()
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

	it('attempts to reconnect early if the tab becomes active', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		const hiddenMock = jest.spyOn(document, 'hidden', 'get')
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

	it('supports receiving messages', async () => {
		const onMessage = jest.fn()
		adapter.onReceiveMessage(onMessage)
		connectMock.mockImplementationOnce((ws) => {
			ws.send('{ "type": "message", "data": "hello" }')
		})

		await waitFor(() => onMessage.mock.calls.length === 1)
		expect(onMessage).toHaveBeenCalledWith({ type: 'message', data: 'hello' })
	})

	it('supports sending messages', async () => {
		const onMessage = jest.fn()
		connectMock.mockImplementationOnce((ws) => {
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

	it('signals status changes', async () => {
		const onStatusChange = jest.fn()
		adapter.onStatusChange(onStatusChange)

		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(onStatusChange).toHaveBeenCalledWith('online')
		connectedServerSocket.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(onStatusChange).toHaveBeenCalledWith('offline', 1006)

		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(onStatusChange).toHaveBeenCalledWith('online')
		connectedServerSocket.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(onStatusChange).toHaveBeenCalledWith('offline', 1006)

		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(onStatusChange).toHaveBeenCalledWith('online')
		adapter._ws?.onerror?.({} as any)
		expect(onStatusChange).toHaveBeenCalledWith('error', undefined)
	})

	it('signals the correct closeCode when a room is not found', async () => {
		const onStatusChange = jest.fn()
		adapter.onStatusChange(onStatusChange)
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

		adapter._ws!.onclose?.({ code: 4099 } as any)

		expect(onStatusChange).toHaveBeenCalledWith('error', 4099)
	})

	it('signals status changes while restarting', async () => {
		const onStatusChange = jest.fn()
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

		adapter.onStatusChange(onStatusChange)

		adapter.restart()

		await waitFor(() => onStatusChange.mock.calls.length === 2)

		expect(onStatusChange).toHaveBeenCalledWith('offline', undefined)
		expect(onStatusChange).toHaveBeenCalledWith('online')
	})
})
