import { TLRecord } from '@tldraw/tldraw'
import { TLSocketClientSentEvent, TLSYNC_PROTOCOL_VERSION } from '@tldraw/tlsync'
import path from 'node:path'
import type { WebSocketServer as WebSocketServerType, WebSocket as WsWebSocketType } from 'ws/index'
import { ClientWebSocketAdapter } from './ClientWebSocketAdapter'

// Hack: the `ws` package has an import map mapping browser context to a dummy implementation
// that just throws an error, because it's impossible to create a websocket in the browser
// and `ws` tries to guard its users. Unfortunately, we also need to run Jest in dom context,
// which causes it to select the browser version of the package.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ws = require('' + path.dirname(require.resolve('ws')) + '/index.js')
// const WsWebSocket = ws.WebSocket as typeof WsWebSocketType
const WebSocketServer = ws.WebSocketServer as typeof WebSocketServerType

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
	let wsServer: WebSocketServerType
	let connectedWs: WsWebSocketType
	const connectMock = jest.fn<void, [socket: WsWebSocketType]>((socket) => {
		connectedWs = socket
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
		const prevWes = adapter._ws
		const prevConnectedWs = connectedWs
		adapter._ws?.onerror?.({} as any)
		// advanceTimersByTime is pointless when running against real network events
		// jest.advanceTimersByTime(1000)
		await waitFor(() => connectedWs !== prevConnectedWs)
		expect(adapter._ws).not.toBe(prevWes)
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
		connectedWs.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(adapter.connectionStatus).toBe('offline')
	})
	it('retries to connect if the server disconnects', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		connectedWs.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(adapter.connectionStatus).toBe('offline')
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(adapter.connectionStatus).toBe('online')
		connectedWs.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(adapter.connectionStatus).toBe('offline')
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(adapter.connectionStatus).toBe('online')
	})

	it('closes the socket if the window goes offline and attempts to reconnect', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		const closeSpy = jest.spyOn(adapter._ws!, 'close')
		window.dispatchEvent(new Event('offline'))
		expect(closeSpy).toHaveBeenCalled()
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
	})

	it('attempts to reconnect early if the window comes back online', async () => {
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		wsServer.close()
		window.dispatchEvent(new Event('offline'))
		adapter._reconnectTimeout.intervalLength = 50000
		window.dispatchEvent(new Event('online'))
		expect(adapter._reconnectTimeout.intervalLength).toBeLessThan(1000)
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
			schema: { schemaVersion: 0, storeVersion: 0, recordVersions: {} },
			protocolVersion: TLSYNC_PROTOCOL_VERSION,
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
		connectedWs.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(onStatusChange).toHaveBeenCalledWith('offline')
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(onStatusChange).toHaveBeenCalledWith('online')
		connectedWs.terminate()
		await waitFor(() => adapter._ws?.readyState === WebSocket.CLOSED)
		expect(onStatusChange).toHaveBeenCalledWith('offline')
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)
		expect(onStatusChange).toHaveBeenCalledWith('online')
		adapter._ws?.onerror?.({} as any)
		expect(onStatusChange).toHaveBeenCalledWith('error')
	})

	it('signals status changes while restarting', async () => {
		const onStatusChange = jest.fn()
		await waitFor(() => adapter._ws?.readyState === WebSocket.OPEN)

		adapter.onStatusChange(onStatusChange)

		adapter.restart()

		await waitFor(() => onStatusChange.mock.calls.length === 2)

		expect(onStatusChange).toHaveBeenCalledWith('offline')
		expect(onStatusChange).toHaveBeenCalledWith('online')
	})
})
