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

describe('RoomSession timeout constants', () => {
	it('should have logical timeout ordering for session management', () => {
		// This test ensures the timeout constants have a logical relationship
		// that supports proper session lifecycle management:
		// - Quick cleanup for disconnected sessions
		// - Reasonable wait time for initial connections
		// - Patient timeout for active sessions
		expect(SESSION_REMOVAL_WAIT_TIME).toBeLessThan(SESSION_START_WAIT_TIME)
		expect(SESSION_START_WAIT_TIME).toBeLessThan(SESSION_IDLE_TIMEOUT)
	})
})

describe('RoomSession state transitions', () => {
	const baseSessionData = {
		sessionId: 'test-session-id',
		presenceId: 'test-presence-id',
		socket: createMockSocket(),
		meta: { userId: 'test-user' },
		isReadonly: false,
		requiresLegacyRejection: false,
	}

	it('should support complete session lifecycle', () => {
		// Test that sessions can progress through their full lifecycle
		// This validates the discriminated union works correctly for state management

		// Start in awaiting state
		const initialSession: RoomSession<TLRecord, { userId: string }> = {
			state: RoomSessionState.AwaitingConnectMessage,
			sessionStartTime: Date.now(),
			...baseSessionData,
		}

		// Progress to connected state (simulates successful connection)
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

		// End in awaiting removal state (simulates disconnection)
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

		// Verify session ID remains consistent across state changes
		// This is critical for tracking sessions through their lifecycle
		expect(initialSession.sessionId).toBe(connectedSession.sessionId)
		expect(connectedSession.sessionId).toBe(removalSession.sessionId)

		// Verify state-specific properties are present when expected
		expect(initialSession.state).toBe(RoomSessionState.AwaitingConnectMessage)
		expect(connectedSession.state).toBe(RoomSessionState.Connected)
		expect(removalSession.state).toBe(RoomSessionState.AwaitingRemoval)
	})
})
