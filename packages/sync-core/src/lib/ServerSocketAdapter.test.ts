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

class MockClosedWebSocket extends MockWebSocket {
	override readyState = 3 // CLOSED
}

class MockConnectingWebSocket extends MockWebSocket {
	override readyState = 0 // CONNECTING
}

class MockClosingWebSocket extends MockWebSocket {
	override readyState = 2 // CLOSING
}

// Mock minimal WebSocket without optional methods (simulating Bun or other implementations)
class MinimalMockWebSocket implements WebSocketMinimal {
	readyState: number = 1
	send = vi.fn()
	close = vi.fn()
	// No addEventListener/removeEventListener
}

describe('WebSocketMinimal interface', () => {
	it('supports standard WebSocket interface', () => {
		const ws = new MockWebSocket()

		expect(typeof ws.send).toBe('function')
		expect(typeof ws.close).toBe('function')
		expect(typeof ws.readyState).toBe('number')
		expect(typeof ws.addEventListener).toBe('function')
		expect(typeof ws.removeEventListener).toBe('function')
	})

	it('supports minimal WebSocket interface without optional methods', () => {
		const ws = new MinimalMockWebSocket()

		expect(typeof ws.send).toBe('function')
		expect(typeof ws.close).toBe('function')
		expect(typeof ws.readyState).toBe('number')
		expect((ws as any).addEventListener).toBeUndefined()
		expect((ws as any).removeEventListener).toBeUndefined()
	})
})

describe('ServerSocketAdapter', () => {
	describe('Construction', () => {
		it('should be constructable with minimal options', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter).toBeInstanceOf(ServerSocketAdapter)
			expect(adapter.opts.ws).toBe(mockWs)
			expect(adapter.opts.onBeforeSendMessage).toBeUndefined()
		})

		it('should be constructable with all options', () => {
			const mockWs = new MockWebSocket()
			const onBeforeSendMessage = vi.fn()

			const adapter = new ServerSocketAdapter({
				ws: mockWs,
				onBeforeSendMessage,
			})

			expect(adapter).toBeInstanceOf(ServerSocketAdapter)
			expect(adapter.opts.ws).toBe(mockWs)
			expect(adapter.opts.onBeforeSendMessage).toBe(onBeforeSendMessage)
		})

		it('should store options as readonly', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter.opts).toBeDefined()
			// Test that opts is readonly by attempting to modify (should not throw in runtime but is type-protected)
			expect(() => {
				// @ts-expect-error - testing readonly property
				adapter.opts = {} as any
			}).not.toThrow() // Runtime doesn't prevent this, but TypeScript does
		})
	})

	describe('isOpen getter', () => {
		it('should return true when WebSocket is open (readyState === 1)', () => {
			const mockWs = new MockWebSocket()
			mockWs.readyState = 1 // OPEN
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter.isOpen).toBe(true)
		})

		it('should return false when WebSocket is connecting (readyState === 0)', () => {
			const mockWs = new MockConnectingWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter.isOpen).toBe(false)
		})

		it('should return false when WebSocket is closing (readyState === 2)', () => {
			const mockWs = new MockClosingWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter.isOpen).toBe(false)
		})

		it('should return false when WebSocket is closed (readyState === 3)', () => {
			const mockWs = new MockClosedWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter.isOpen).toBe(false)
		})

		it('should handle invalid readyState values', () => {
			const mockWs = new MockWebSocket()
			mockWs.readyState = 999 // Invalid state
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter.isOpen).toBe(false)
		})

		it('should handle negative readyState values', () => {
			const mockWs = new MockWebSocket()
			mockWs.readyState = -1 // Invalid negative state
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			expect(adapter.isOpen).toBe(false)
		})
	})

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

		it('should handle complex message objects correctly', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			const complexMessage: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'connect',
				hydrationType: 'wipe_all',
				connectRequestId: 'complex-test-456',
				protocolVersion: 2,
				schema: {
					schemaVersion: 2,
					sequences: {
						'com.tldraw.store': 1,
						'com.tldraw.shape': 1,
						'com.tldraw.page': 2,
					},
				},
				diff: {
					'record:123': ['patch', { x: ['put', 100], y: ['put', 200] }] as any,
					'record:456': ['put', { id: 'record:456', typeName: 'shape' }] as any,
				},
				serverClock: 42,
				isReadonly: true,
			}

			adapter.sendMessage(complexMessage)

			expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(complexMessage))
		})

		it('should work without onBeforeSendMessage callback', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			const message: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'pong',
			}

			// Should not throw even without callback
			expect(() => adapter.sendMessage(message)).not.toThrow()
			expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message))
		})

		it('should handle different message types', () => {
			const mockWs = new MockWebSocket()
			const onBeforeSendMessage = vi.fn()
			const adapter = new ServerSocketAdapter({ ws: mockWs, onBeforeSendMessage })

			// Test connect message
			const connectMessage: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'connect',
				hydrationType: 'wipe_presence',
				connectRequestId: 'connect-789',
				protocolVersion: 1,
				schema: { schemaVersion: 1, storeVersion: 0, recordVersions: {} },
				diff: {},
				serverClock: 10,
				isReadonly: false,
			}
			adapter.sendMessage(connectMessage)

			// Test custom message
			const customMessage: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'custom',
				data: 'Test custom message',
			}
			adapter.sendMessage(customMessage)

			// Test incompatibility_error message
			const incompatibilityMessage: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'incompatibility_error',
				reason: 'clientTooOld',
			}
			adapter.sendMessage(incompatibilityMessage)

			expect(onBeforeSendMessage).toHaveBeenCalledTimes(3)
			expect(mockWs.send).toHaveBeenCalledTimes(3)
		})

		it('should handle messages with minimal WebSocket implementation', () => {
			const minimalWs = new MinimalMockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: minimalWs })

			const message: TLSocketServerSentEvent<UnknownRecord> = {
				type: 'pong',
			}

			expect(() => adapter.sendMessage(message)).not.toThrow()
			expect(minimalWs.send).toHaveBeenCalledWith(JSON.stringify(message))
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

		it('should handle standard close codes', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			// Test normal closure
			adapter.close(1000, 'Normal closure')
			expect(mockWs.close).toHaveBeenCalledWith(1000, 'Normal closure')

			mockWs.close.mockClear()

			// Test going away
			adapter.close(1001, 'Endpoint going away')
			expect(mockWs.close).toHaveBeenCalledWith(1001, 'Endpoint going away')
		})

		it('should handle custom close codes', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			// Test application-specific close code
			adapter.close(4000, 'Custom application error')

			expect(mockWs.close).toHaveBeenCalledWith(4000, 'Custom application error')
		})

		it('should work with minimal WebSocket implementation', () => {
			const minimalWs = new MinimalMockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: minimalWs })

			expect(() => adapter.close(1000, 'Test close')).not.toThrow()
			expect(minimalWs.close).toHaveBeenCalledWith(1000, 'Test close')
		})
	})

	describe('TLRoomSocket interface compliance', () => {
		it('should implement all required TLRoomSocket methods', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter({ ws: mockWs })

			// Check that adapter implements TLRoomSocket interface
			expect(typeof adapter.isOpen).toBe('boolean')
			expect(typeof adapter.sendMessage).toBe('function')
			expect(typeof adapter.close).toBe('function')
		})

		it('should work as TLRoomSocket in type system', () => {
			const mockWs = new MockWebSocket()
			const adapter = new ServerSocketAdapter<UnknownRecord>({ ws: mockWs })

			// This test verifies type compatibility by using the adapter as TLRoomSocket
			const testFunction = (socket: {
				isOpen: boolean
				sendMessage: (msg: any) => void
				close: (code?: number, reason?: string) => void
			}) => {
				return socket.isOpen
			}

			expect(() => testFunction(adapter)).not.toThrow()
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
				{ name: 'Closed WebSocket', ws: new MockClosedWebSocket() },
				{ name: 'Connecting WebSocket', ws: new MockConnectingWebSocket() },
			]

			scenarios.forEach(({ name, ws }) => {
				const adapter = new ServerSocketAdapter({ ws })

				expect(adapter, `${name} should create adapter`).toBeInstanceOf(ServerSocketAdapter)
				expect(typeof adapter.isOpen, `${name} should have isOpen property`).toBe('boolean')

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
