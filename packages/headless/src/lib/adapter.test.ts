import { once } from 'node:events'
import { describe, expect, it } from 'vitest'
import { WebSocketServer } from 'ws'
import { connectHeadlessEditor } from './connectHeadlessEditor'
import { createHeadlessEditor } from './createHeadlessEditor'
import { NodeWebSocketAdapter } from './NodeWebSocketAdapter'

// The happy-path websocket round trip is covered by the behavioral suite
// (../test/sync-behavior.test.ts); these are the adapter's unique error paths.
describe('NodeWebSocketAdapter', () => {
	// The thunk error itself feeds the retry loop (as a warning), so the observable rejection
	// is the connect timeout — the point is that nothing escapes as an unhandled rejection.
	it('surfaces a throwing uri thunk as a clean connectTimeout rejection', async () => {
		const editor = createHeadlessEditor()
		try {
			await expect(
				connectHeadlessEditor(editor, {
					uri: () => {
						throw new Error('no uri for you')
					},
					connectTimeout: 300,
				})
			).rejects.toThrow(/could not connect/)
		} finally {
			editor.dispose()
		}
	})

	it('rejects within connectTimeout when the server is unreachable', async () => {
		const editor = createHeadlessEditor()
		try {
			const start = Date.now()
			await expect(
				// a port from the TEST-NET range that nothing listens on
				connectHeadlessEditor(editor, { uri: 'ws://127.0.0.1:1', connectTimeout: 500 })
			).rejects.toThrow(/could not connect/)
			expect(Date.now() - start).toBeLessThan(5000)
		} finally {
			editor.dispose()
		}
	})

	it('binds only one socket when restart() lands during an in-flight connect', async () => {
		// The constructor's connect awaits the gated uri thunk; restart() supersedes it and
		// schedules a second connect that awaits the same gate. Releasing the gate resolves
		// both — without the connect-generation guard, both bind and the first socket is
		// orphaned open, pinning the process.
		const wss = new WebSocketServer({ port: 0 })
		await once(wss, 'listening')
		const address = wss.address()
		if (typeof address === 'string' || address === null) throw new Error('expected a port')
		let connections = 0
		wss.on('connection', () => connections++)

		let release!: () => void
		const gate = new Promise<void>((resolve) => (release = resolve))
		const adapter = new NodeWebSocketAdapter(
			async () => {
				await gate
				return `ws://127.0.0.1:${address.port}`
			},
			{ minReconnectDelay: 20 }
		)
		try {
			adapter.restart()
			// let the restart's reconnect timer fire so its connect is also awaiting the gate
			await new Promise((resolve) => setTimeout(resolve, 60))
			release()
			await new Promise((resolve) => setTimeout(resolve, 300))
			expect(adapter.connectionStatus).toBe('online')
			expect(connections).toBe(1)
		} finally {
			adapter.close()
			await new Promise<void>((resolve) => wss.close(() => resolve()))
		}
	})

	it('binds no socket when close() lands during an in-flight connect', async () => {
		// The shutdown-path twin of the restart test: without the generation guard, the
		// in-flight connect would resolve after close() and orphan a live socket.
		const wss = new WebSocketServer({ port: 0 })
		await once(wss, 'listening')
		const address = wss.address()
		if (typeof address === 'string' || address === null) throw new Error('expected a port')
		let connections = 0
		wss.on('connection', () => connections++)

		let release!: () => void
		const gate = new Promise<void>((resolve) => (release = resolve))
		const adapter = new NodeWebSocketAdapter(async () => {
			await gate
			return `ws://127.0.0.1:${address.port}`
		})
		try {
			adapter.close()
			release()
			await new Promise((resolve) => setTimeout(resolve, 300))
			expect(connections).toBe(0)
			expect(adapter.connectionStatus).not.toBe('online')
		} finally {
			adapter.close()
			await new Promise<void>((resolve) => wss.close(() => resolve()))
		}
	})
})
