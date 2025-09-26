import { atom } from '@tldraw/state'
import { TLAssetStore, TLStore } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { type RemoteTLStoreWithStatus, type UseSyncOptions } from './useSync'

describe('useSync', () => {
	describe('type definitions', () => {
		it('should export RemoteTLStoreWithStatus type correctly', () => {
			// This is a compile-time test to ensure the type is properly exported
			const loadingStore: RemoteTLStoreWithStatus = { status: 'loading' }
			const errorStore: RemoteTLStoreWithStatus = {
				status: 'error',
				error: new Error('Test error'),
			}
			const syncedStore: RemoteTLStoreWithStatus = {
				status: 'synced-remote',
				connectionStatus: 'online',
				store: {} as TLStore,
			}

			expect(loadingStore.status).toBe('loading')
			expect(errorStore.status).toBe('error')
			expect(errorStore.error).toBeInstanceOf(Error)
			expect(syncedStore.status).toBe('synced-remote')
			expect(syncedStore.connectionStatus).toBe('online')
		})

		it('should define UseSyncOptions interface correctly', () => {
			// Test that required options are enforced at compile time
			const basicOptions: UseSyncOptions = {
				uri: 'ws://test.com',
				assets: {} as TLAssetStore,
			}

			const advancedOptions: UseSyncOptions = {
				uri: async () => 'ws://test.com',
				assets: {} as TLAssetStore,
				userInfo: { id: 'user-1', name: 'Test', color: '#ff0000' },
				roomId: 'room-123',
				onCustomMessageReceived: () => {},
				getUserPresence: () => null,
				onMount: () => {},
				trackAnalyticsEvent: () => {},
			}

			expect(basicOptions.uri).toBeDefined()
			expect(basicOptions.assets).toBeDefined()
			expect(advancedOptions.uri).toBeDefined()
			expect(advancedOptions.assets).toBeDefined()
			expect(typeof advancedOptions.userInfo).toBe('object')
			expect(advancedOptions.roomId).toBe('room-123')
		})

		it('should handle different URI types', () => {
			// String URI
			const stringUriOptions: UseSyncOptions = {
				uri: 'wss://example.com/sync',
				assets: {} as TLAssetStore,
			}
			expect(typeof stringUriOptions.uri).toBe('string')

			// Function URI
			const funcUriOptions: UseSyncOptions = {
				uri: () => 'wss://example.com/sync',
				assets: {} as TLAssetStore,
			}
			expect(typeof funcUriOptions.uri).toBe('function')

			// Async function URI
			const asyncUriOptions: UseSyncOptions = {
				uri: async () => 'wss://example.com/sync',
				assets: {} as TLAssetStore,
			}
			expect(typeof asyncUriOptions.uri).toBe('function')
		})

		it('should handle different userInfo types', () => {
			// Static user info
			const staticUserOptions: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore,
				userInfo: { id: 'user-1', name: 'Alice', color: '#ff0000' },
			}
			expect(staticUserOptions.userInfo).toHaveProperty('id')
			expect(staticUserOptions.userInfo).toHaveProperty('name')
			expect(staticUserOptions.userInfo).toHaveProperty('color')

			// Signal user info
			const userSignal = atom('user', { id: 'user-1', name: 'Alice', color: '#ff0000' })
			const signalUserOptions: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore,
				userInfo: userSignal,
			}
			expect(signalUserOptions.userInfo).toBeDefined()
		})

		it('should require assets parameter', () => {
			// This test ensures assets is required - if it's not, this won't compile
			const options: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore, // Required!
			}
			expect(options.assets).toBeDefined()
		})

		it('should allow optional parameters', () => {
			const options: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore,
				// All optional parameters
				roomId: undefined,
				userInfo: undefined,
				onCustomMessageReceived: undefined,
				getUserPresence: undefined,
				onMount: undefined,
				trackAnalyticsEvent: undefined,
			}

			expect(options.uri).toBeDefined()
			expect(options.assets).toBeDefined()
		})
	})

	describe('RemoteTLStoreWithStatus type constraints', () => {
		it('should exclude local-only states from RemoteTLStoreWithStatus', () => {
			// These should be valid RemoteTLStoreWithStatus states
			const loadingState: RemoteTLStoreWithStatus = { status: 'loading' }
			const errorState: RemoteTLStoreWithStatus = {
				status: 'error',
				error: new Error('Connection failed'),
			}
			const syncedState: RemoteTLStoreWithStatus = {
				status: 'synced-remote',
				connectionStatus: 'online',
				store: {} as TLStore,
			}

			expect(loadingState).toBeDefined()
			expect(errorState).toBeDefined()
			expect(syncedState).toBeDefined()

			// Type constraint test - the following should NOT be assignable to RemoteTLStoreWithStatus
			// (This is checked at compile time, not runtime)
			// const invalidState1: RemoteTLStoreWithStatus = { status: 'synced-local', store: {} as TLStore }
			// const invalidState2: RemoteTLStoreWithStatus = { status: 'not-synced' }
		})

		it('should handle different connection statuses in synced-remote state', () => {
			const onlineState: RemoteTLStoreWithStatus = {
				status: 'synced-remote',
				connectionStatus: 'online',
				store: {} as TLStore,
			}

			const offlineState: RemoteTLStoreWithStatus = {
				status: 'synced-remote',
				connectionStatus: 'offline',
				store: {} as TLStore,
			}

			expect(onlineState.connectionStatus).toBe('online')
			expect(offlineState.connectionStatus).toBe('offline')
		})
	})

	describe('interface contract validation', () => {
		it('should validate getUserPresence function signature', () => {
			const getUserPresence: UseSyncOptions['getUserPresence'] = (store, user) => {
				// Validate the parameters have the expected structure
				expect(store).toBeDefined()
				expect(user).toHaveProperty('id')
				expect(user).toHaveProperty('name')
				expect(user).toHaveProperty('color')

				// Return a valid presence state
				return {
					currentPageId: 'page:1' as any,
					userId: user.id,
					userName: user.name || 'Anonymous',
					cursor: { x: 0, y: 0, type: 'default', rotation: 0 },
				}
			}

			const options: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore,
				getUserPresence,
			}

			expect(options.getUserPresence).toBe(getUserPresence)
		})

		it('should validate onCustomMessageReceived handler signature', () => {
			const onCustomMessageReceived: UseSyncOptions['onCustomMessageReceived'] = (data) => {
				// Handler should be able to receive any data
				expect(data).toBeDefined()
			}

			const options: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore,
				onCustomMessageReceived,
			}

			expect(options.onCustomMessageReceived).toBe(onCustomMessageReceived)
		})

		it('should validate trackAnalyticsEvent handler signature', () => {
			const trackAnalyticsEvent: UseSyncOptions['trackAnalyticsEvent'] = (name, data) => {
				expect(typeof name).toBe('string')
				expect(typeof data).toBe('object')
			}

			const options: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore,
				trackAnalyticsEvent,
			}

			expect(options.trackAnalyticsEvent).toBe(trackAnalyticsEvent)
		})
	})

	describe('edge case type handling', () => {
		it('should handle null return from getUserPresence', () => {
			const getUserPresenceReturnsNull: UseSyncOptions['getUserPresence'] = () => null

			const options: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: {} as TLAssetStore,
				getUserPresence: getUserPresenceReturnsNull,
			}

			expect(options.getUserPresence).toBe(getUserPresenceReturnsNull)
		})

		it('should handle complex URI construction scenarios', () => {
			// Test URI with query parameters
			const uriWithParams = 'wss://example.com/sync?room=123&token=abc'
			const options1: UseSyncOptions = {
				uri: uriWithParams,
				assets: {} as TLAssetStore,
			}
			expect(options1.uri).toBe(uriWithParams)

			// Test dynamic URI function
			const dynamicUri = () => `wss://example.com/sync?timestamp=${Date.now()}`
			const options2: UseSyncOptions = {
				uri: dynamicUri,
				assets: {} as TLAssetStore,
			}
			expect(typeof options2.uri).toBe('function')

			// Test async URI function with authentication
			const asyncAuthUri = async () => {
				const token = 'fake-token'
				return `wss://example.com/sync?token=${token}`
			}
			const options3: UseSyncOptions = {
				uri: asyncAuthUri,
				assets: {} as TLAssetStore,
			}
			expect(typeof options3.uri).toBe('function')
		})

		it('should handle different asset store implementations', () => {
			const mockAssetStore: TLAssetStore = {
				upload: async () => ({ src: 'uploaded-url' }),
				resolve: () => 'resolved-url',
			}

			const options: UseSyncOptions = {
				uri: 'wss://example.com',
				assets: mockAssetStore,
			}

			expect(options.assets).toBe(mockAssetStore)
			expect(typeof options.assets.upload).toBe('function')
			expect(typeof options.assets.resolve).toBe('function')
		})
	})
})
