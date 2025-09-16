import { RecordId, SerializedSchema, UnknownRecord } from '@tldraw/store'
import { describe, expect, it } from 'vitest'
import { NetworkDiff, ObjectDiff, RecordOpType } from './diff'
import {
	TLConnectRequest,
	TLIncompatibilityReason,
	TLPingRequest,
	TLPushRequest,
	TLSocketClientSentEvent,
	TLSocketServerSentDataEvent,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from './protocol'

// Test record type for testing
interface TestRecord extends UnknownRecord {
	typeName: 'test'
	id: RecordId<TestRecord>
	x: number
	y: number
	name: string
}

describe('protocol', () => {
	describe('getTlsyncProtocolVersion', () => {
		it('should return the current protocol version', () => {
			const version = getTlsyncProtocolVersion()
			expect(typeof version).toBe('number')
			expect(version).toBeGreaterThan(0)
			expect(Number.isInteger(version)).toBe(true)
		})

		it('should return a consistent version number', () => {
			const version1 = getTlsyncProtocolVersion()
			const version2 = getTlsyncProtocolVersion()
			expect(version1).toBe(version2)
		})

		it('should return version 7 as the current version', () => {
			expect(getTlsyncProtocolVersion()).toBe(7)
		})
	})

	describe('TLIncompatibilityReason', () => {
		it('should contain all expected incompatibility reason constants', () => {
			expect(TLIncompatibilityReason.ClientTooOld).toBe('clientTooOld')
			expect(TLIncompatibilityReason.ServerTooOld).toBe('serverTooOld')
			expect(TLIncompatibilityReason.InvalidRecord).toBe('invalidRecord')
			expect(TLIncompatibilityReason.InvalidOperation).toBe('invalidOperation')
		})

		it('should be a constant object with expected structure', () => {
			// The object is created with 'as const' but is not actually frozen
			// This test verifies the object structure and prevents accidental modification
			const originalKeys = Object.keys(TLIncompatibilityReason)
			expect(originalKeys).toEqual([
				'ClientTooOld',
				'ServerTooOld',
				'InvalidRecord',
				'InvalidOperation',
			])

			// Verify the object can be extended (though it shouldn't be in practice)
			const testObj = { ...TLIncompatibilityReason }
			expect(testObj).toEqual(TLIncompatibilityReason)
		})

		it('should have exactly 4 reasons defined', () => {
			const keys = Object.keys(TLIncompatibilityReason)
			expect(keys).toHaveLength(4)
			expect(keys).toContain('ClientTooOld')
			expect(keys).toContain('ServerTooOld')
			expect(keys).toContain('InvalidRecord')
			expect(keys).toContain('InvalidOperation')
		})

		it('should have string values for all reasons', () => {
			Object.values(TLIncompatibilityReason).forEach((reason) => {
				expect(typeof reason).toBe('string')
				expect(reason.length).toBeGreaterThan(0)
			})
		})
	})

	describe('TLConnectRequest', () => {
		const mockSchema: SerializedSchema = {
			schemaVersion: 1,
			recordVersions: {},
			storeVersion: 1,
		}

		it('should create a valid connect request', () => {
			const connectRequest: TLConnectRequest = {
				type: 'connect',
				connectRequestId: 'conn-123',
				lastServerClock: 42,
				protocolVersion: 7,
				schema: mockSchema,
			}

			expect(connectRequest.type).toBe('connect')
			expect(connectRequest.connectRequestId).toBe('conn-123')
			expect(connectRequest.lastServerClock).toBe(42)
			expect(connectRequest.protocolVersion).toBe(7)
			expect(connectRequest.schema).toEqual(mockSchema)
		})

		it('should handle zero lastServerClock', () => {
			const connectRequest: TLConnectRequest = {
				type: 'connect',
				connectRequestId: 'first-connect',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: mockSchema,
			}

			expect(connectRequest.lastServerClock).toBe(0)
		})

		it('should handle large lastServerClock values', () => {
			const connectRequest: TLConnectRequest = {
				type: 'connect',
				connectRequestId: 'reconnect-456',
				lastServerClock: Number.MAX_SAFE_INTEGER,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: mockSchema,
			}

			expect(connectRequest.lastServerClock).toBe(Number.MAX_SAFE_INTEGER)
		})

		it('should handle empty string connectRequestId', () => {
			const connectRequest: TLConnectRequest = {
				type: 'connect',
				connectRequestId: '',
				lastServerClock: 10,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: mockSchema,
			}

			expect(connectRequest.connectRequestId).toBe('')
		})
	})

	describe('TLPingRequest', () => {
		it('should create a valid ping request', () => {
			const pingRequest: TLPingRequest = {
				type: 'ping',
			}

			expect(pingRequest.type).toBe('ping')
		})

		it('should only have the type property', () => {
			const pingRequest: TLPingRequest = {
				type: 'ping',
			}

			const keys = Object.keys(pingRequest)
			expect(keys).toHaveLength(1)
			expect(keys[0]).toBe('type')
		})
	})

	describe('TLPushRequest', () => {
		const mockNetworkDiff: NetworkDiff<TestRecord> = {
			'test:123': [
				RecordOpType.Put,
				{
					typeName: 'test',
					id: 'test:123' as RecordId<TestRecord>,
					x: 100,
					y: 200,
					name: 'Test Shape',
				},
			],
		}

		const mockObjectDiff: ObjectDiff = {
			x: ['put', 150],
			y: ['put', 250],
		}

		it('should create a valid push request with diff only', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: 15,
				diff: mockNetworkDiff,
			}

			expect(pushRequest.type).toBe('push')
			expect(pushRequest.clientClock).toBe(15)
			expect(pushRequest.diff).toEqual(mockNetworkDiff)
			expect(pushRequest.presence).toBeUndefined()
		})

		it('should create a valid push request with presence patch', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: 20,
				presence: [RecordOpType.Patch, mockObjectDiff],
			}

			expect(pushRequest.type).toBe('push')
			expect(pushRequest.clientClock).toBe(20)
			expect(pushRequest.presence).toEqual([RecordOpType.Patch, mockObjectDiff])
			expect(pushRequest.diff).toBeUndefined()
		})

		it('should create a valid push request with presence put', () => {
			const presenceRecord: TestRecord = {
				typeName: 'test',
				id: 'presence:user1' as RecordId<TestRecord>,
				x: 300,
				y: 400,
				name: 'User Cursor',
			}

			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: 25,
				presence: [RecordOpType.Put, presenceRecord],
			}

			expect(pushRequest.type).toBe('push')
			expect(pushRequest.clientClock).toBe(25)
			expect(pushRequest.presence).toEqual([RecordOpType.Put, presenceRecord])
		})

		it('should create a valid push request with both diff and presence', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: 30,
				diff: mockNetworkDiff,
				presence: [RecordOpType.Patch, mockObjectDiff],
			}

			expect(pushRequest.type).toBe('push')
			expect(pushRequest.clientClock).toBe(30)
			expect(pushRequest.diff).toEqual(mockNetworkDiff)
			expect(pushRequest.presence).toEqual([RecordOpType.Patch, mockObjectDiff])
		})

		it('should create a valid push request with minimal data', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: 1,
			}

			expect(pushRequest.type).toBe('push')
			expect(pushRequest.clientClock).toBe(1)
			expect(pushRequest.diff).toBeUndefined()
			expect(pushRequest.presence).toBeUndefined()
		})

		it('should handle zero clientClock', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: 0,
			}

			expect(pushRequest.clientClock).toBe(0)
		})

		it('should handle large clientClock values', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: Number.MAX_SAFE_INTEGER,
			}

			expect(pushRequest.clientClock).toBe(Number.MAX_SAFE_INTEGER)
		})
	})

	describe('TLSocketClientSentEvent', () => {
		it('should accept TLConnectRequest', () => {
			const connectEvent: TLSocketClientSentEvent<TestRecord> = {
				type: 'connect',
				connectRequestId: 'test-connect',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: { schemaVersion: 1, recordVersions: {}, storeVersion: 1 },
			}

			expect(connectEvent.type).toBe('connect')
		})

		it('should accept TLPushRequest', () => {
			const pushEvent: TLSocketClientSentEvent<TestRecord> = {
				type: 'push',
				clientClock: 10,
			}

			expect(pushEvent.type).toBe('push')
		})

		it('should accept TLPingRequest', () => {
			const pingEvent: TLSocketClientSentEvent<TestRecord> = {
				type: 'ping',
			}

			expect(pingEvent.type).toBe('ping')
		})
	})

	describe('TLSocketServerSentDataEvent', () => {
		const mockNetworkDiff: NetworkDiff<TestRecord> = {
			'test:456': [RecordOpType.Patch, { name: ['put', 'Updated Name'] }],
		}

		it('should create a valid patch event', () => {
			const patchEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'patch',
				diff: mockNetworkDiff,
				serverClock: 100,
			}

			expect(patchEvent.type).toBe('patch')
			expect(patchEvent.diff).toEqual(mockNetworkDiff)
			expect(patchEvent.serverClock).toBe(100)
		})

		it('should create a valid push_result event with commit action', () => {
			const pushResultEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'push_result',
				clientClock: 15,
				serverClock: 105,
				action: 'commit',
			}

			expect(pushResultEvent.type).toBe('push_result')
			expect(pushResultEvent.clientClock).toBe(15)
			expect(pushResultEvent.serverClock).toBe(105)
			expect(pushResultEvent.action).toBe('commit')
		})

		it('should create a valid push_result event with discard action', () => {
			const pushResultEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'push_result',
				clientClock: 20,
				serverClock: 110,
				action: 'discard',
			}

			expect(pushResultEvent.type).toBe('push_result')
			expect(pushResultEvent.action).toBe('discard')
		})

		it('should create a valid push_result event with rebase action', () => {
			const pushResultEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'push_result',
				clientClock: 25,
				serverClock: 115,
				action: {
					rebaseWithDiff: mockNetworkDiff,
				},
			}

			expect(pushResultEvent.type).toBe('push_result')
			expect(pushResultEvent.action).toEqual({
				rebaseWithDiff: mockNetworkDiff,
			})
		})

		it('should handle zero clock values in patch event', () => {
			const patchEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'patch',
				diff: {},
				serverClock: 0,
			}

			expect(patchEvent.serverClock).toBe(0)
		})

		it('should handle empty diff in patch event', () => {
			const patchEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'patch',
				diff: {},
				serverClock: 50,
			}

			expect(patchEvent.diff).toEqual({})
		})
	})

	describe('TLSocketServerSentEvent', () => {
		const mockSchema: SerializedSchema = {
			schemaVersion: 1,
			recordVersions: { test: { version: 1 } },
			storeVersion: 1,
		}

		const mockNetworkDiff: NetworkDiff<TestRecord> = {
			'test:789': [
				RecordOpType.Put,
				{
					typeName: 'test',
					id: 'test:789' as RecordId<TestRecord>,
					x: 500,
					y: 600,
					name: 'Server Shape',
				},
			],
		}

		it('should create a valid connect event with wipe_all hydration', () => {
			const connectEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'connect',
				hydrationType: 'wipe_all',
				connectRequestId: 'conn-456',
				protocolVersion: getTlsyncProtocolVersion(),
				schema: mockSchema,
				diff: mockNetworkDiff,
				serverClock: 200,
				isReadonly: false,
			}

			expect(connectEvent.type).toBe('connect')
			expect(connectEvent.hydrationType).toBe('wipe_all')
			expect(connectEvent.connectRequestId).toBe('conn-456')
			expect(connectEvent.protocolVersion).toBe(getTlsyncProtocolVersion())
			expect(connectEvent.schema).toEqual(mockSchema)
			expect(connectEvent.diff).toEqual(mockNetworkDiff)
			expect(connectEvent.serverClock).toBe(200)
			expect(connectEvent.isReadonly).toBe(false)
		})

		it('should create a valid connect event with wipe_presence hydration', () => {
			const connectEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'connect',
				hydrationType: 'wipe_presence',
				connectRequestId: 'conn-789',
				protocolVersion: getTlsyncProtocolVersion(),
				schema: mockSchema,
				diff: {},
				serverClock: 250,
				isReadonly: true,
			}

			expect(connectEvent.type).toBe('connect')
			expect(connectEvent.hydrationType).toBe('wipe_presence')
			expect(connectEvent.isReadonly).toBe(true)
		})

		it('should create a valid incompatibility_error event', () => {
			const errorEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'incompatibility_error',
				reason: TLIncompatibilityReason.ClientTooOld,
			}

			expect(errorEvent.type).toBe('incompatibility_error')
			expect(errorEvent.reason).toBe('clientTooOld')
		})

		it('should create a valid pong event', () => {
			const pongEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'pong',
			}

			expect(pongEvent.type).toBe('pong')
			expect(Object.keys(pongEvent)).toHaveLength(1)
		})

		it('should create a valid data event with array of data events', () => {
			const dataEvents: TLSocketServerSentDataEvent<TestRecord>[] = [
				{
					type: 'patch',
					diff: mockNetworkDiff,
					serverClock: 300,
				},
				{
					type: 'push_result',
					clientClock: 30,
					serverClock: 305,
					action: 'commit',
				},
			]

			const dataEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'data',
				data: dataEvents,
			}

			expect(dataEvent.type).toBe('data')
			expect(dataEvent.data).toEqual(dataEvents)
			expect(dataEvent.data).toHaveLength(2)
		})

		it('should create a valid custom event', () => {
			const customData = { customField: 'customValue', number: 42 }
			const customEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'custom',
				data: customData,
			}

			expect(customEvent.type).toBe('custom')
			expect(customEvent.data).toEqual(customData)
		})

		it('should accept TLSocketServerSentDataEvent directly', () => {
			const dataEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'patch',
				diff: mockNetworkDiff,
				serverClock: 400,
			}

			const serverEvent: TLSocketServerSentEvent<TestRecord> = dataEvent

			expect(serverEvent.type).toBe('patch')
			expect(serverEvent).toEqual(dataEvent)
		})

		it('should handle empty data array', () => {
			const dataEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'data',
				data: [],
			}

			expect(dataEvent.data).toHaveLength(0)
		})

		it('should handle custom event with null data', () => {
			const customEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'custom',
				data: null,
			}

			expect(customEvent.data).toBeNull()
		})

		it('should handle custom event with undefined data', () => {
			const customEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'custom',
				data: undefined,
			}

			expect(customEvent.data).toBeUndefined()
		})

		it('should handle all incompatibility reasons', () => {
			const reasons = [
				TLIncompatibilityReason.ClientTooOld,
				TLIncompatibilityReason.ServerTooOld,
				TLIncompatibilityReason.InvalidRecord,
				TLIncompatibilityReason.InvalidOperation,
			]

			reasons.forEach((reason) => {
				const errorEvent: TLSocketServerSentEvent<TestRecord> = {
					type: 'incompatibility_error',
					reason,
				}

				expect(errorEvent.type).toBe('incompatibility_error')
				expect(errorEvent.reason).toBe(reason)
			})
		})
	})

	describe('type compatibility and edge cases', () => {
		it('should handle complex nested network diffs', () => {
			const complexDiff: NetworkDiff<TestRecord> = {
				'test:1': [
					RecordOpType.Put,
					{
						typeName: 'test',
						id: 'test:1' as RecordId<TestRecord>,
						x: 0,
						y: 0,
						name: 'Origin',
					},
				],
				'test:2': [
					RecordOpType.Patch,
					{
						x: ['put', 100],
						name: ['put', 'Updated'],
					},
				],
				'test:3': [RecordOpType.Remove],
			}

			const patchEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'patch',
				diff: complexDiff,
				serverClock: 500,
			}

			expect(patchEvent.diff).toEqual(complexDiff)
			expect(Object.keys(patchEvent.diff)).toHaveLength(3)
		})

		it('should handle maximum and minimum safe integer values for clocks', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: Number.MAX_SAFE_INTEGER,
			}

			const patchEvent: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'patch',
				diff: {},
				serverClock: Number.MIN_SAFE_INTEGER,
			}

			expect(pushRequest.clientClock).toBe(Number.MAX_SAFE_INTEGER)
			expect(patchEvent.serverClock).toBe(Number.MIN_SAFE_INTEGER)
		})

		it('should maintain type safety across different record types', () => {
			interface AnotherRecord extends UnknownRecord {
				typeName: 'another'
				id: RecordId<AnotherRecord>
				value: string
			}

			const anotherDiff: NetworkDiff<AnotherRecord> = {
				'another:1': [
					RecordOpType.Put,
					{
						typeName: 'another',
						id: 'another:1' as RecordId<AnotherRecord>,
						value: 'test',
					},
				],
			}

			const pushRequest: TLPushRequest<AnotherRecord> = {
				type: 'push',
				clientClock: 100,
				diff: anotherDiff,
			}

			expect(pushRequest.diff).toEqual(anotherDiff)
		})

		it('should handle protocol version mismatch scenarios', () => {
			const connectRequest: TLConnectRequest = {
				type: 'connect',
				connectRequestId: 'version-test',
				lastServerClock: 0,
				protocolVersion: 999, // Future version
				schema: { schemaVersion: 1, recordVersions: {}, storeVersion: 1 },
			}

			const errorResponse: TLSocketServerSentEvent<TestRecord> = {
				type: 'incompatibility_error',
				reason: TLIncompatibilityReason.ServerTooOld,
			}

			expect(connectRequest.protocolVersion).toBe(999)
			expect(errorResponse.reason).toBe('serverTooOld')
		})

		it('should handle empty schemas', () => {
			const emptySchema: SerializedSchema = {
				schemaVersion: 1,
				recordVersions: {},
				storeVersion: 1,
			}

			const connectRequest: TLConnectRequest = {
				type: 'connect',
				connectRequestId: 'empty-schema',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: emptySchema,
			}

			expect(connectRequest.schema).toEqual(emptySchema)
		})
	})

	describe('message serialization compatibility', () => {
		it('should handle JSON serialization and deserialization of connect request', () => {
			const connectRequest: TLConnectRequest = {
				type: 'connect',
				connectRequestId: 'json-test',
				lastServerClock: 42,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: { schemaVersion: 1, recordVersions: { test: { version: 1 } }, storeVersion: 1 },
			}

			const serialized = JSON.stringify(connectRequest)
			const deserialized = JSON.parse(serialized) as TLConnectRequest

			expect(deserialized).toEqual(connectRequest)
			expect(deserialized.type).toBe('connect')
			expect(deserialized.protocolVersion).toBe(connectRequest.protocolVersion)
		})

		it('should handle JSON serialization and deserialization of push request', () => {
			const pushRequest: TLPushRequest<TestRecord> = {
				type: 'push',
				clientClock: 25,
				diff: {
					'test:123': [
						RecordOpType.Put,
						{
							typeName: 'test',
							id: 'test:123' as RecordId<TestRecord>,
							x: 100,
							y: 200,
							name: 'Serialization Test',
						},
					],
				},
				presence: [RecordOpType.Patch, { x: ['put', 150] }],
			}

			const serialized = JSON.stringify(pushRequest)
			const deserialized = JSON.parse(serialized) as TLPushRequest<TestRecord>

			expect(deserialized).toEqual(pushRequest)
			expect(deserialized.type).toBe('push')
			expect(deserialized.clientClock).toBe(25)
		})

		it('should handle JSON serialization and deserialization of server events', () => {
			const serverEvent: TLSocketServerSentEvent<TestRecord> = {
				type: 'data',
				data: [
					{
						type: 'patch',
						diff: { 'test:1': [RecordOpType.Remove] },
						serverClock: 100,
					},
					{
						type: 'push_result',
						clientClock: 10,
						serverClock: 105,
						action: 'commit',
					},
				],
			}

			const serialized = JSON.stringify(serverEvent)
			const deserialized = JSON.parse(serialized) as TLSocketServerSentEvent<TestRecord>

			expect(deserialized).toEqual(serverEvent)
			expect(deserialized.type).toBe('data')
			if (deserialized.type === 'data') {
				expect(Array.isArray(deserialized.data)).toBe(true)
			}
		})
	})
})
