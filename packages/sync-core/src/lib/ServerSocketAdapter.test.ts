import { UnknownRecord } from '@tldraw/store'
import { describe, expect, it, vi } from 'vitest'
import { ServerSocketAdapter, WebSocketMinimal } from './ServerSocketAdapter'
import { TLSocketServerSentEvent } from './protocol'

// Mock WebSocket implementations for testing different scenarios
class MockWebSocket implements WebSocketMinimal {
	readyState: number = 1 // OPEN by default
	send = vi.fn()
	close = vi.fn()
	addEventListener = vi.fn()
	removeEventListener = vi.fn()
}

class MinimalMockWebSocket implements WebSocketMinimal {
	readyState: number = 1
	send = vi.fn()
	close = vi.fn()
	// No addEventListener/removeEventListener
}

describe('ServerSocketAdapter', () => {
	describe('sendMessage', () => {
		it('should JSON stringify and send the message', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

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

			expect(mockWs.send).toHaveBeenCalledTimes(1)
			expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message))
		})

		it('should call onBeforeSendMessage callback when provided', () => {
			const mockWs = new MockWebSocket()
			const onBeforeSendMessage = vi.fn()
			const adapter = new ServerSocketAdapter({ ws: mockWs, onBeforeSendMessage })

			const message: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'data',
				data: [{ type: 'patch', diff: {}, serverClock: 1 }],
			}

			adapter.sendMessage(message)

			expect(onBeforeSendMessage).toHaveBeenCalledTimes(1)
			expect(onBeforeSendMessage).toHaveBeenCalledWith(message, JSON.stringify(message))
			expect(mockWs.send).toHaveBeenCalledTimes(1)
		})

		it('should call onBeforeSendMessage before sending to WebSocket', () => {
			const mockWs = new MockWebSocket()
			const callOrder: string[] = []

			const onBeforeSendMessage = vi.fn(() => {
				callOrder.push('callback')
			})

			mockWs.send.mockImplementation(() => {
				callOrder.push('websocket')
			})

			const adapter = new ServerSocketAdapter({ ws: mockWs, onBeforeSendMessage })

			const message: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'pong',
			}

			adapter.sendMessage(message)

			expect(callOrder).toEqual(['callback', 'websocket'])
		})
	})

	describe('close method', () => {
		it('should call close on the underlying WebSocket with no parameters', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			adapter.close()

			expect(mockWs.close).toHaveBeenCalledTimes(1)
			expect(mockWs.close).toHaveBeenCalledWith(undefined, undefined)
		})

		it('should call close on the underlying WebSocket with code only', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			const closeCode = 1000
			adapter.close(closeCode)

			expect(mockWs.close).toHaveBeenCalledTimes(1)
			expect(mockWs.close).toHaveBeenCalledWith(closeCode, undefined)
		})

		it('should call close on the underlying WebSocket with code and reason', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			const closeCode = 1001
			const closeReason = 'Going away'
			adapter.close(closeCode, closeReason)

			expect(mockWs.close).toHaveBeenCalledTimes(1)
			expect(mockWs.close).toHaveBeenCalledWith(closeCode, closeReason)
		})
	})

	describe('Error handling', () => {
		it('should handle WebSocket send errors gracefully', () => {
			const mockWs = new MockWebSocket()
			mockWs.send.mockImplementation(() => {
				throw new Error('WebSocket send failed')
			})

			const adapter = new ServerSocketAdapter({ ws: mockWs })

			const message: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'pong',
			}

			expect(() => adapter.sendMessage(message)).toThrow('WebSocket send failed')
		})

		it('should handle WebSocket close errors gracefully', () => {
			const mockWs = new MockWebSocket()
			mockWs.close.mockImplementation(() => {
				throw new Error('WebSocket close failed')
			})

			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(() => adapter.close()).toThrow('WebSocket close failed')
		})

		it('should handle onBeforeSendMessage callback errors', () => {
			const mockWs = new MockWebSocket()
			const faultyCallback = vi.fn(() => {
				throw new Error('Callback error')
			})

			const adapter = new ServerSocketAdapter({ ws: mockWs, onBeforeSendMessage: faultyCallback })

			const message: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'pong',
			}

			expect(() => adapter.sendMessage(message)).toThrow('Callback error')
			expect(faultyCallback).toHaveBeenCalled()
			// WebSocket send should not be called if callback throws
			expect(mockWs.send).not.toHaveBeenCalled()
		})
	})

	describe('Integration scenarios', () => {
		it('should work with different WebSocket implementations', () => {
			const scenarios = [
				{ name: 'Standard WebSocket', ws: new MockWebSocket() },
				{ name: 'Minimal WebSocket', ws: new MinimalMockWebSocket() },
			]

			scenarios.forEach(({ name, ws }) => {
				const adapter = new ServerSocketAdapter({ ws })

				expect(adapter, `${name} should create adapter`).toBeInstanceOf(ServerSocketAdapter)

				const message: TLSocketServerSentEvent<UnknownRecord> = {
					type: 'pong',
				}

				expect(
					() => adapter.sendMessage(message),
					`${name} should handle sendMessage`
				).not.toThrow()
				expect(() => adapter.close(), `${name} should handle close`).not.toThrow()
			})
		})

		it('should handle rapid message sending', () => {
			const mockWs = new MockWebSocket()
			const onBeforeSendMessage = vi.fn()
			const adapter = new ServerSocketAdapter({ ws: mockWs, onBeforeSendMessage })

			// Send multiple messages rapidly
			for (let i = 0; i < 100; i++) {
				const message: TLSocketServerSentEvent<UnknownRecord> = {
					type: 'pong',
				}
				adapter.sendMessage(message)
			}

			expect(mockWs.send).toHaveBeenCalledTimes(100)
			expect(onBeforeSendMessage).toHaveBeenCalledTimes(100)
		})

		it('should maintain consistent behavior across state changes', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			// Test behavior when WebSocket changes state
			expect(adapter.isOpen).toBe(true)

			mockWs.readyState = 0 // CONNECTING
			expect(adapter.isOpen).toBe(false)

			mockWs.readyState = 2 // CLOSING
			expect(adapter.isOpen).toBe(false)

			mockWs.readyState = 3 // CLOSED
			expect(adapter.isOpen).toBe(false)

			mockWs.readyState = 1 // OPEN
			expect(adapter.isOpen).toBe(true)
		})
	})
})
