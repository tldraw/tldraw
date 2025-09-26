import { SerializedSchema } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import {
	RoomSession,
	RoomSessionState,
	SESSION_IDLE_TIMEOUT,
	SESSION_REMOVAL_WAIT_TIME,
	SESSION_START_WAIT_TIME,
} from './RoomSession'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentDataEvent } from './protocol'

// Mock socket implementation for testing
const createMockSocket = (): TLRoomSocket<TLRecord> => ({
	isOpen: true,
	sendMessage: vi.fn(),
	close: vi.fn(),
})

// Mock serialized schema for testing
const mockSerializedSchema: SerializedSchema = {
	schemaVersion: 1,
	storeVersion: 1,
	recordVersions: {},
}

describe('RoomSessionState', () => {
	it('should contain the correct state values', () => {
		expect(RoomSessionState.AwaitingConnectMessage).toBe('awaiting-connect-message')
		expect(RoomSessionState.AwaitingRemoval).toBe('awaiting-removal')
		expect(RoomSessionState.Connected).toBe('connected')
	})

	it('should be a const object', () => {
		expect(typeof RoomSessionState).toBe('object')
		expect(RoomSessionState).toBeDefined()
	})

	it('should have exactly three states', () => {
		const stateValues = Object.values(RoomSessionState)
		expect(stateValues).toHaveLength(3)
		expect(stateValues).toContain('awaiting-connect-message')
		expect(stateValues).toContain('awaiting-removal')
		expect(stateValues).toContain('connected')
	})

	it('should have the correct state keys', () => {
		const stateKeys = Object.keys(RoomSessionState)
		expect(stateKeys).toHaveLength(3)
		expect(stateKeys).toContain('AwaitingConnectMessage')
		expect(stateKeys).toContain('AwaitingRemoval')
		expect(stateKeys).toContain('Connected')
	})

	it('should have consistent key-value mapping', () => {
		expect(RoomSessionState.AwaitingConnectMessage).toBe('awaiting-connect-message')
		expect(RoomSessionState.AwaitingRemoval).toBe('awaiting-removal')
		expect(RoomSessionState.Connected).toBe('connected')
	})
})

describe('Session timeout constants', () => {
	describe('SESSION_START_WAIT_TIME', () => {
		it('should be 10 seconds', () => {
			expect(SESSION_START_WAIT_TIME).toBe(10000)
		})

		it('should be exported as a public constant', () => {
			expect(typeof SESSION_START_WAIT_TIME).toBe('number')
			expect(SESSION_START_WAIT_TIME).toBeGreaterThan(0)
		})
	})

	describe('SESSION_REMOVAL_WAIT_TIME', () => {
		it('should be 5 seconds', () => {
			expect(SESSION_REMOVAL_WAIT_TIME).toBe(5000)
		})

		it('should be exported as a public constant', () => {
			expect(typeof SESSION_REMOVAL_WAIT_TIME).toBe('number')
			expect(SESSION_REMOVAL_WAIT_TIME).toBeGreaterThan(0)
		})

		it('should be less than SESSION_START_WAIT_TIME', () => {
			expect(SESSION_REMOVAL_WAIT_TIME).toBeLessThan(SESSION_START_WAIT_TIME)
		})
	})

	describe('SESSION_IDLE_TIMEOUT', () => {
		it('should be 20 seconds', () => {
			expect(SESSION_IDLE_TIMEOUT).toBe(20000)
		})

		it('should be exported as a public constant', () => {
			expect(typeof SESSION_IDLE_TIMEOUT).toBe('number')
			expect(SESSION_IDLE_TIMEOUT).toBeGreaterThan(0)
		})

		it('should be greater than SESSION_START_WAIT_TIME', () => {
			expect(SESSION_IDLE_TIMEOUT).toBeGreaterThan(SESSION_START_WAIT_TIME)
		})
	})

	describe('timeout relationships', () => {
		it('should have logical timeout ordering', () => {
			// Removal wait time should be shortest (quick cleanup)
			expect(SESSION_REMOVAL_WAIT_TIME).toBeLessThan(SESSION_START_WAIT_TIME)
			expect(SESSION_REMOVAL_WAIT_TIME).toBeLessThan(SESSION_IDLE_TIMEOUT)

			// Start wait time should be moderate
			expect(SESSION_START_WAIT_TIME).toBeLessThan(SESSION_IDLE_TIMEOUT)

			// Idle timeout should be longest (patient with active sessions)
			expect(SESSION_IDLE_TIMEOUT).toBeGreaterThan(SESSION_START_WAIT_TIME)
			expect(SESSION_IDLE_TIMEOUT).toBeGreaterThan(SESSION_REMOVAL_WAIT_TIME)
		})
	})
})

describe('RoomSession type structure', () => {
	const baseSessionData = {
		sessionId: 'test-session-id',
		presenceId: 'test-presence-id',
		socket: createMockSocket(),
		meta: { userId: 'test-user' },
		isReadonly: false,
		requiresLegacyRejection: false,
	}

	describe('AwaitingConnectMessage state', () => {
		it('should contain required properties', () => {
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionStartTime: Date.now(),
				...baseSessionData,
			}

			expect(session.state).toBe(RoomSessionState.AwaitingConnectMessage)
			expect(session.sessionId).toBe('test-session-id')
			expect(session.presenceId).toBe('test-presence-id')
			expect(session.socket).toBeDefined()
			expect(session.sessionStartTime).toBeTypeOf('number')
			expect(session.meta).toEqual({ userId: 'test-user' })
			expect(session.isReadonly).toBe(false)
			expect(session.requiresLegacyRejection).toBe(false)
		})

		it('should handle null presenceId', () => {
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionStartTime: Date.now(),
				...baseSessionData,
				presenceId: null,
			}

			expect(session.presenceId).toBeNull()
		})

		it('should handle readonly sessions', () => {
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionStartTime: Date.now(),
				...baseSessionData,
				isReadonly: true,
			}

			expect(session.isReadonly).toBe(true)
		})

		it('should handle legacy rejection requirement', () => {
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionStartTime: Date.now(),
				...baseSessionData,
				requiresLegacyRejection: true,
			}

			expect(session.requiresLegacyRejection).toBe(true)
		})
	})

	describe('AwaitingRemoval state', () => {
		it('should contain required properties', () => {
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingRemoval,
				cancellationTime: Date.now(),
				...baseSessionData,
			}

			expect(session.state).toBe(RoomSessionState.AwaitingRemoval)
			expect(session.sessionId).toBe('test-session-id')
			expect(session.presenceId).toBe('test-presence-id')
			expect(session.socket).toBeDefined()
			expect(session.cancellationTime).toBeTypeOf('number')
			expect(session.meta).toEqual({ userId: 'test-user' })
			expect(session.isReadonly).toBe(false)
			expect(session.requiresLegacyRejection).toBe(false)
		})

		it('should handle custom cancellation times', () => {
			const cancellationTime = Date.now() + SESSION_REMOVAL_WAIT_TIME
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingRemoval,
				cancellationTime,
				...baseSessionData,
			}

			expect(session.cancellationTime).toBe(cancellationTime)
		})
	})

	describe('Connected state', () => {
		it('should contain required properties', () => {
			const mockDataMessages: TLSocketServerSentDataEvent<TLRecord>[] = []
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.Connected,
				serializedSchema: mockSerializedSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: mockDataMessages,
				...baseSessionData,
			}

			expect(session.state).toBe(RoomSessionState.Connected)
			expect(session.sessionId).toBe('test-session-id')
			expect(session.presenceId).toBe('test-presence-id')
			expect(session.socket).toBeDefined()
			expect(session.serializedSchema).toEqual(mockSerializedSchema)
			expect(session.lastInteractionTime).toBeTypeOf('number')
			expect(session.debounceTimer).toBeNull()
			expect(session.outstandingDataMessages).toEqual([])
			expect(session.meta).toEqual({ userId: 'test-user' })
			expect(session.isReadonly).toBe(false)
			expect(session.requiresLegacyRejection).toBe(false)
		})

		it('should handle active debounce timer', () => {
			const timer = setTimeout(() => {}, 1000)
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.Connected,
				serializedSchema: mockSerializedSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: timer,
				outstandingDataMessages: [],
				...baseSessionData,
			}

			expect(session.debounceTimer).toBe(timer)
			clearTimeout(timer) // Clean up
		})

		it('should handle outstanding data messages queue', () => {
			const mockDataMessage: TLSocketServerSentDataEvent<TLRecord> = {
				type: 'patch',
				diff: {},
				serverClock: 123,
			}
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.Connected,
				serializedSchema: mockSerializedSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [mockDataMessage],
				...baseSessionData,
			}

			expect(session.outstandingDataMessages).toHaveLength(1)
			expect(session.outstandingDataMessages[0]).toEqual(mockDataMessage)
		})

		it('should handle different serialized schema structures', () => {
			const customSchema: SerializedSchema = {
				schemaVersion: 2,
				sequences: {
					'com.example.shape': 1,
					'com.example.page': 2,
				},
			}

			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.Connected,
				serializedSchema: customSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [],
				...baseSessionData,
			}

			expect(session.serializedSchema).toEqual(customSchema)
		})
	})

	describe('type discrimination', () => {
		it('should properly discriminate between session states', () => {
			const awaitingConnectSession: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionStartTime: Date.now(),
				...baseSessionData,
			}

			const awaitingRemovalSession: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingRemoval,
				cancellationTime: Date.now(),
				...baseSessionData,
			}

			const connectedSession: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.Connected,
				serializedSchema: mockSerializedSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [],
				...baseSessionData,
			}

			// Type narrowing should work correctly
			if (awaitingConnectSession.state === RoomSessionState.AwaitingConnectMessage) {
				expect(awaitingConnectSession.sessionStartTime).toBeTypeOf('number')
				// @ts-expect-error - cancellationTime should not exist on this state
				expect(awaitingConnectSession.cancellationTime).toBeUndefined()
			}

			if (awaitingRemovalSession.state === RoomSessionState.AwaitingRemoval) {
				expect(awaitingRemovalSession.cancellationTime).toBeTypeOf('number')
				// @ts-expect-error - sessionStartTime should not exist on this state
				expect(awaitingRemovalSession.sessionStartTime).toBeUndefined()
			}

			if (connectedSession.state === RoomSessionState.Connected) {
				expect(connectedSession.serializedSchema).toBeDefined()
				expect(connectedSession.outstandingDataMessages).toBeInstanceOf(Array)
				// @ts-expect-error - sessionStartTime should not exist on this state
				expect(connectedSession.sessionStartTime).toBeUndefined()
				// @ts-expect-error - cancellationTime should not exist on this state
				expect(connectedSession.cancellationTime).toBeUndefined()
			}
		})
	})

	describe('generic type parameters', () => {
		interface CustomMeta {
			userId: string
			permissions: string[]
			lastSeen: Date
		}

		it('should support custom meta types', () => {
			const customMeta: CustomMeta = {
				userId: 'custom-user',
				permissions: ['read', 'write'],
				lastSeen: new Date(),
			}

			const session: RoomSession<TLRecord, CustomMeta> = {
				state: RoomSessionState.Connected,
				sessionId: 'custom-session',
				presenceId: 'custom-presence',
				socket: createMockSocket(),
				serializedSchema: mockSerializedSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [],
				meta: customMeta,
				isReadonly: true,
				requiresLegacyRejection: false,
			}

			expect(session.meta.userId).toBe('custom-user')
			expect(session.meta.permissions).toEqual(['read', 'write'])
			expect(session.meta.lastSeen).toBeInstanceOf(Date)
			expect(session.isReadonly).toBe(true)
		})

		it('should support primitive meta types', () => {
			const session: RoomSession<TLRecord, string> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionId: 'string-meta-session',
				presenceId: null,
				socket: createMockSocket(),
				sessionStartTime: Date.now(),
				meta: 'simple-string-meta',
				isReadonly: false,
				requiresLegacyRejection: false,
			}

			expect(session.meta).toBe('simple-string-meta')
		})

		it('should support null meta types', () => {
			const session: RoomSession<TLRecord, null> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionId: 'null-meta-session',
				presenceId: null,
				socket: createMockSocket(),
				sessionStartTime: Date.now(),
				meta: null,
				isReadonly: false,
				requiresLegacyRejection: false,
			}

			expect(session.meta).toBeNull()
		})
	})

	describe('session state transitions', () => {
		it('should support logical state transitions', () => {
			// Sessions typically start in AwaitingConnectMessage
			const initialSession: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionStartTime: Date.now(),
				...baseSessionData,
			}

			// Then transition to Connected after receiving connect message
			const connectedSession: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.Connected,
				sessionId: initialSession.sessionId,
				presenceId: initialSession.presenceId,
				socket: initialSession.socket,
				meta: initialSession.meta,
				isReadonly: initialSession.isReadonly,
				requiresLegacyRejection: initialSession.requiresLegacyRejection,
				serializedSchema: mockSerializedSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [],
			}

			// Finally transition to AwaitingRemoval on disconnect
			const removalSession: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingRemoval,
				sessionId: connectedSession.sessionId,
				presenceId: connectedSession.presenceId,
				socket: connectedSession.socket,
				meta: connectedSession.meta,
				isReadonly: connectedSession.isReadonly,
				requiresLegacyRejection: connectedSession.requiresLegacyRejection,
				cancellationTime: Date.now(),
			}

			expect(initialSession.state).toBe(RoomSessionState.AwaitingConnectMessage)
			expect(connectedSession.state).toBe(RoomSessionState.Connected)
			expect(removalSession.state).toBe(RoomSessionState.AwaitingRemoval)

			// Session ID should remain consistent across transitions
			expect(initialSession.sessionId).toBe(connectedSession.sessionId)
			expect(connectedSession.sessionId).toBe(removalSession.sessionId)
		})
	})

	describe('edge cases', () => {
		it('should handle empty string session IDs', () => {
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionId: '',
				presenceId: null,
				socket: createMockSocket(),
				sessionStartTime: Date.now(),
				meta: { userId: 'test-user' },
				isReadonly: false,
				requiresLegacyRejection: false,
			}

			expect(session.sessionId).toBe('')
		})

		it('should handle very long session IDs', () => {
			const longSessionId = 'a'.repeat(1000)
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionId: longSessionId,
				presenceId: null,
				socket: createMockSocket(),
				sessionStartTime: Date.now(),
				meta: { userId: 'test-user' },
				isReadonly: false,
				requiresLegacyRejection: false,
			}

			expect(session.sessionId).toBe(longSessionId)
			expect(session.sessionId.length).toBe(1000)
		})

		it('should handle extreme timestamp values', () => {
			const extremeTimestamp = Number.MAX_SAFE_INTEGER
			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.AwaitingConnectMessage,
				sessionStartTime: extremeTimestamp,
				...baseSessionData,
			}

			expect(session.sessionStartTime).toBe(extremeTimestamp)
		})

		it('should handle closed socket state', () => {
			const closedSocket: TLRoomSocket<TLRecord> = {
				isOpen: false,
				sendMessage: vi.fn(),
				close: vi.fn(),
			}

			const session: RoomSession<TLRecord, { userId: string }> = {
				state: RoomSessionState.Connected,
				sessionId: 'test-session-id',
				presenceId: 'test-presence-id',
				socket: closedSocket,
				serializedSchema: mockSerializedSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [],
				meta: { userId: 'test-user' },
				isReadonly: false,
				requiresLegacyRejection: false,
			}

			expect(session.socket.isOpen).toBe(false)
		})
	})
})
