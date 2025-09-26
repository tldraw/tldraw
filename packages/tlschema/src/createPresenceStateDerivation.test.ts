import { atom } from '@tldraw/state'
import { Store } from '@tldraw/store'
import { IndexKey } from '@tldraw/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createPresenceStateDerivation,
	getDefaultUserPresence,
	TLPresenceStateInfo,
	TLPresenceUserInfo,
} from './createPresenceStateDerivation'
import { createTLSchema } from './createTLSchema'
import { CameraRecordType } from './records/TLCamera'
import { TLINSTANCE_ID } from './records/TLInstance'
import { PageRecordType, TLPageId } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { TLPOINTER_ID } from './records/TLPointer'
import { InstancePresenceRecordType } from './records/TLPresence'
import { TLRecord } from './records/TLRecord'
import { createIntegrityChecker, TLStoreProps } from './TLStore'

describe('TLPresenceUserInfo interface', () => {
	it('should define user info correctly with required fields', () => {
		const userInfo: TLPresenceUserInfo = {
			id: 'user123',
		}

		expect(userInfo.id).toBe('user123')
		expect(userInfo.name).toBeUndefined()
		expect(userInfo.color).toBeUndefined()
	})

	it('should support optional name and color fields', () => {
		const userInfo: TLPresenceUserInfo = {
			id: 'user456',
			name: 'Alice Designer',
			color: '#FF6B6B',
		}

		expect(userInfo.id).toBe('user456')
		expect(userInfo.name).toBe('Alice Designer')
		expect(userInfo.color).toBe('#FF6B6B')
	})

	it('should support null values for optional fields', () => {
		const userInfo: TLPresenceUserInfo = {
			id: 'user789',
			name: null,
			color: null,
		}

		expect(userInfo.id).toBe('user789')
		expect(userInfo.name).toBe(null)
		expect(userInfo.color).toBe(null)
	})
})

describe('TLPresenceStateInfo type', () => {
	it('should be compatible with InstancePresenceRecordType.create parameters', () => {
		const stateInfo: TLPresenceStateInfo = {
			userId: 'user123',
			userName: 'Test User',
			currentPageId: 'page:main' as TLPageId,
			selectedShapeIds: [],
			brush: null,
			scribbles: [],
			followingUserId: null,
			camera: { x: 0, y: 0, z: 1 },
			color: '#FF0000',
			cursor: { x: 0, y: 0, rotation: 0, type: 'default' },
			lastActivityTimestamp: Date.now(),
			screenBounds: null,
			chatMessage: '',
			meta: {},
		}

		// Should be compatible with record creation
		expect(() =>
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('test'),
				...stateInfo,
			})
		).not.toThrow()
	})
})

describe('createPresenceStateDerivation', () => {
	let store: Store<TLRecord, TLStoreProps>
	let userSignal: ReturnType<typeof atom<TLPresenceUserInfo>>

	beforeEach(() => {
		const schema = createTLSchema()
		store = new Store({
			schema,
			props: {
				defaultName: 'Test Store',
				assets: {
					upload: vi.fn().mockResolvedValue({ src: 'uploaded-url' }),
					resolve: vi.fn().mockResolvedValue('resolved-url'),
					remove: vi.fn().mockResolvedValue(undefined),
				},
				onMount: vi.fn(),
			},
		})

		// Initialize store with required records
		const checker = createIntegrityChecker(store)
		checker()

		userSignal = atom('user', {
			id: 'user123',
			name: 'Test User',
			color: '#007AFF',
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('basic functionality', () => {
		it('should return a function that creates a computed signal', () => {
			const derivation = createPresenceStateDerivation(userSignal)

			expect(typeof derivation).toBe('function')

			const presenceSignal = derivation(store)
			expect(typeof presenceSignal.get).toBe('function')
		})

		it('should create presence state with default instance ID', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence).toBeDefined()
			expect(presence!.id).toBe(InstancePresenceRecordType.createId(store.id))
			expect(presence!.userId).toBe('user123')
			expect(presence!.userName).toBe('Test User')
			expect(presence!.color).toBe('#007AFF')
		})

		it('should create presence state with custom instance ID', () => {
			const customId = InstancePresenceRecordType.createId('custom-instance')
			const derivation = createPresenceStateDerivation(userSignal, customId)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence!.id).toBe(customId)
			expect(presence!.userId).toBe('user123')
		})

		it('should be reactive to user signal changes', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			const initialPresence = presenceSignal.get()
			expect(initialPresence!.userName).toBe('Test User')
			expect(initialPresence!.color).toBe('#007AFF')

			// Update user signal
			userSignal.set({
				id: 'user123',
				name: 'Updated User',
				color: '#FF6B6B',
			})

			const updatedPresence = presenceSignal.get()
			expect(updatedPresence!.userName).toBe('Updated User')
			expect(updatedPresence!.color).toBe('#FF6B6B')
		})

		it('should return null when user signal is null/empty', () => {
			const nullUserSignal = atom('nullUser', null as any)
			const derivation = createPresenceStateDerivation(nullUserSignal)
			const presenceSignal = derivation(store)

			expect(presenceSignal.get()).toBe(null)
		})

		it('should return null when getDefaultUserPresence returns null', () => {
			// Remove required records to make getDefaultUserPresence return null
			store.remove([TLINSTANCE_ID])

			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			expect(presenceSignal.get()).toBe(null)
		})

		it('should handle user with minimal information', () => {
			const minimalUser = atom('minimalUser', { id: 'minimal123' })
			const derivation = createPresenceStateDerivation(minimalUser)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence).toBeDefined()
			expect(presence!.userId).toBe('minimal123')
			expect(presence!.userName).toBe('') // Default when name is undefined
			expect(presence!.color).toBe('#FF0000') // Default color
		})

		it('should handle user with null name and color', () => {
			const userWithNulls = atom('userWithNulls', {
				id: 'null-user',
				name: null,
				color: null,
			})
			const derivation = createPresenceStateDerivation(userWithNulls)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence!.userId).toBe('null-user')
			expect(presence!.userName).toBe('') // null gets converted to ''
			expect(presence!.color).toBe('#FF0000') // null gets default color
		})
	})

	describe('store state integration', () => {
		it('should reflect current store state in presence', () => {
			// Modify store state
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const pageState = store.get(InstancePageStateRecordType.createId(pageId))!
			const camera = store.get(CameraRecordType.createId(pageId))!
			const pointer = store.get(TLPOINTER_ID)!

			// Update store records
			store.put([
				{
					...pageState,
					selectedShapeIds: ['shape:test1' as any, 'shape:test2' as any],
				},
				{
					...camera,
					x: 100,
					y: 200,
					z: 1.5,
				},
				{
					...pointer,
					x: 300,
					y: 400,
					lastActivityTimestamp: 123456789,
				},
			])

			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence!.selectedShapeIds).toEqual(['shape:test1', 'shape:test2'])
			expect(presence!.camera).toEqual({ x: 100, y: 200, z: 1.5 })
			expect(presence!.cursor!.x).toBe(300)
			expect(presence!.cursor!.y).toBe(400)
			expect(presence!.lastActivityTimestamp).toBe(123456789)
		})

		it('should be reactive to store changes', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			const initialPresence = presenceSignal.get()
			expect(initialPresence!.selectedShapeIds).toEqual([])

			// Update page state
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const pageState = store.get(InstancePageStateRecordType.createId(pageId))!
			store.put([
				{
					...pageState,
					selectedShapeIds: ['shape:new' as any],
				},
			])

			const updatedPresence = presenceSignal.get()
			expect(updatedPresence!.selectedShapeIds).toEqual(['shape:new'])
		})

		it('should handle missing page states gracefully', () => {
			// Remove page state
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			store.remove([pageStateId])

			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			expect(presenceSignal.get()).toBe(null)
		})

		it('should handle missing camera gracefully', () => {
			// Remove camera
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const cameraId = CameraRecordType.createId(pageId)
			store.remove([cameraId])

			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			expect(presenceSignal.get()).toBe(null)
		})

		it('should handle missing pointer gracefully', () => {
			// Remove pointer
			store.remove([TLPOINTER_ID])

			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			expect(presenceSignal.get()).toBe(null)
		})
	})

	describe('edge cases and error conditions', () => {
		it('should handle corrupted user data gracefully', () => {
			const corruptedUser = atom('corrupted', {
				id: '', // Empty ID
				name: 'Valid Name',
				color: '#INVALID', // Invalid color format (though the function doesn't validate this)
			})

			const derivation = createPresenceStateDerivation(corruptedUser)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence).toBeDefined()
			expect(presence!.userId).toBe('')
			expect(presence!.color).toBe('#INVALID') // Passed through as-is
		})

		it('should handle store with no pages', () => {
			// Clear all pages
			const pageIds = store.query.ids('page').get()
			store.remove([...pageIds])

			// Remove instance to prevent automatic page creation
			store.remove([TLINSTANCE_ID])

			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			expect(presenceSignal.get()).toBe(null)
		})

		it('should handle rapid user changes', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			// Rapid updates
			for (let i = 0; i < 100; i++) {
				userSignal.set({
					id: `user${i}`,
					name: `User ${i}`,
					color: `#${i.toString(16).padStart(6, '0')}`,
				})
			}

			const finalPresence = presenceSignal.get()
			expect(finalPresence!.userId).toBe('user99')
			expect(finalPresence!.userName).toBe('User 99')
		})

		it('should maintain distinct presence for different instance IDs', () => {
			const customId1 = InstancePresenceRecordType.createId('instance1')
			const customId2 = InstancePresenceRecordType.createId('instance2')

			const derivation1 = createPresenceStateDerivation(userSignal, customId1)
			const derivation2 = createPresenceStateDerivation(userSignal, customId2)

			const presence1 = derivation1(store).get()
			const presence2 = derivation2(store).get()

			expect(presence1!.id).toBe(customId1)
			expect(presence2!.id).toBe(customId2)
			expect(presence1!.userId).toBe(presence2!.userId) // Same user
			expect(presence1!.id).not.toBe(presence2!.id) // Different instances
		})
	})

	describe('performance considerations', () => {
		it('should not recreate presence objects unnecessarily', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			const presence1 = presenceSignal.get()
			const presence2 = presenceSignal.get()

			// Should return the same object when nothing has changed
			expect(presence1).toBe(presence2)
		})

		it('should handle multiple concurrent derivations', () => {
			const user1 = atom('user1', { id: 'user1', name: 'User 1' })
			const user2 = atom('user2', { id: 'user2', name: 'User 2' })

			const derivation1 = createPresenceStateDerivation(user1)
			const derivation2 = createPresenceStateDerivation(user2)

			const presence1 = derivation1(store).get()
			const presence2 = derivation2(store).get()

			expect(presence1!.userId).toBe('user1')
			expect(presence2!.userId).toBe('user2')
			expect(presence1!.userName).toBe('User 1')
			expect(presence2!.userName).toBe('User 2')
		})
	})
})

describe('getDefaultUserPresence', () => {
	let store: Store<TLRecord, TLStoreProps>

	beforeEach(() => {
		const schema = createTLSchema()
		store = new Store({
			schema,
			props: {
				defaultName: 'Test Store',
				assets: {
					upload: vi.fn().mockResolvedValue({ src: 'uploaded-url' }),
					resolve: vi.fn().mockResolvedValue('resolved-url'),
					remove: vi.fn().mockResolvedValue(undefined),
				},
				onMount: vi.fn(),
			},
		})

		// Initialize store with required records
		const checker = createIntegrityChecker(store)
		checker()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('basic functionality', () => {
		it('should return default presence state for valid user', () => {
			const user: TLPresenceUserInfo = {
				id: 'test-user',
				name: 'Test User',
				color: '#00FF00',
			}

			const presence = getDefaultUserPresence(store, user)

			expect(presence).toBeDefined()
			expect(presence!.userId).toBe('test-user')
			expect(presence!.userName).toBe('Test User')
			expect(presence!.color).toBe('#00FF00')
			expect(presence!.selectedShapeIds).toEqual([])
			expect(presence!.brush).toBe(null)
			expect(presence!.scribbles).toEqual([])
			expect(presence!.followingUserId).toBe(null)
			expect(presence!.meta).toEqual({})
		})

		it('should use default values for missing user fields', () => {
			const minimalUser: TLPresenceUserInfo = { id: 'minimal' }
			const presence = getDefaultUserPresence(store, minimalUser)

			expect(presence!.userId).toBe('minimal')
			expect(presence!.userName).toBe('')
			expect(presence!.color).toBe('#FF0000')
		})

		it('should handle null user name and color', () => {
			const userWithNulls: TLPresenceUserInfo = {
				id: 'null-user',
				name: null,
				color: null,
			}
			const presence = getDefaultUserPresence(store, userWithNulls)

			expect(presence!.userName).toBe('')
			expect(presence!.color).toBe('#FF0000')
		})

		it('should extract current store state correctly', () => {
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const instance = store.get(TLINSTANCE_ID)!
			const pageState = store.get(InstancePageStateRecordType.createId(pageId))!
			const camera = store.get(CameraRecordType.createId(pageId))!
			const pointer = store.get(TLPOINTER_ID)!

			// Modify store state
			store.put([
				{
					...instance,
					brush: { x: 10, y: 20, w: 100, h: 50 },
					scribbles: [
						{
							id: 'scribble:test',
							points: [{ x: 0, y: 0, z: 0.5 }],
							size: 3,
							color: 'black',
							opacity: 0.8,
							state: 'starting',
							delay: 0,
							shrink: 0,
							taper: false,
						},
					],
					followingUserId: 'leader123',
					cursor: { type: 'pointer', rotation: 45 },
					screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
					chatMessage: 'Hello world',
				},
				{
					...pageState,
					selectedShapeIds: ['shape:1' as any, 'shape:2' as any],
				},
				{
					...camera,
					x: 150,
					y: 250,
					z: 1.25,
				},
				{
					...pointer,
					x: 300,
					y: 400,
					lastActivityTimestamp: 987654321,
				},
			])

			const user: TLPresenceUserInfo = { id: 'test', name: 'Test', color: '#BLUE' }
			const presence = getDefaultUserPresence(store, user)

			expect(presence!.selectedShapeIds).toEqual(['shape:1', 'shape:2'])
			expect(presence!.brush).toEqual({ x: 10, y: 20, w: 100, h: 50 })
			expect(presence!.scribbles).toHaveLength(1)
			expect(presence!.followingUserId).toBe('leader123')
			expect(presence!.camera).toEqual({ x: 150, y: 250, z: 1.25 })
			expect(presence!.cursor).toEqual({ x: 300, y: 400, rotation: 45, type: 'pointer' })
			expect(presence!.lastActivityTimestamp).toBe(987654321)
			expect(presence!.screenBounds).toEqual({ x: 0, y: 0, w: 1920, h: 1080 })
			expect(presence!.chatMessage).toBe('Hello world')
		})

		it('should include current page ID', () => {
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const user: TLPresenceUserInfo = { id: 'test' }
			const presence = getDefaultUserPresence(store, user)

			expect(presence!.currentPageId).toBe(pageId)
		})
	})

	describe('error conditions', () => {
		it('should return null when instance is missing', () => {
			store.remove([TLINSTANCE_ID])
			const user: TLPresenceUserInfo = { id: 'test' }

			expect(getDefaultUserPresence(store, user)).toBe(null)
		})

		it('should return null when page state is missing', () => {
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const pageStateId = InstancePageStateRecordType.createId(pageId)
			store.remove([pageStateId])
			const user: TLPresenceUserInfo = { id: 'test' }

			expect(getDefaultUserPresence(store, user)).toBe(null)
		})

		it('should return null when camera is missing', () => {
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const cameraId = CameraRecordType.createId(pageId)
			store.remove([cameraId])
			const user: TLPresenceUserInfo = { id: 'test' }

			expect(getDefaultUserPresence(store, user)).toBe(null)
		})

		it('should return null when pointer is missing', () => {
			store.remove([TLPOINTER_ID])
			const user: TLPresenceUserInfo = { id: 'test' }

			expect(getDefaultUserPresence(store, user)).toBe(null)
		})

		it('should return null when page state references non-existent page', () => {
			// Create instance with invalid page reference
			const invalidPageId = 'page:nonexistent' as TLPageId
			const instance = store.get(TLINSTANCE_ID)!
			store.put([
				{
					...instance,
					currentPageId: invalidPageId,
				},
			])

			const user: TLPresenceUserInfo = { id: 'test' }
			expect(getDefaultUserPresence(store, user)).toBe(null)
		})

		it('should handle corrupt store state gracefully', () => {
			// Remove all pages but leave instance pointing to non-existent page
			const pageIds = store.query.ids('page').get()
			store.remove([...pageIds])

			// Also remove instance to prevent integrity checker from fixing the state
			store.remove([TLINSTANCE_ID])

			const user: TLPresenceUserInfo = { id: 'test' }
			expect(getDefaultUserPresence(store, user)).toBe(null)
		})
	})

	describe('store state variations', () => {
		it('should handle empty selected shapes', () => {
			const user: TLPresenceUserInfo = { id: 'test' }
			const presence = getDefaultUserPresence(store, user)

			expect(presence!.selectedShapeIds).toEqual([])
		})

		it('should handle null brush', () => {
			const user: TLPresenceUserInfo = { id: 'test' }
			const presence = getDefaultUserPresence(store, user)

			expect(presence!.brush).toBe(null)
		})

		it('should handle empty scribbles', () => {
			const user: TLPresenceUserInfo = { id: 'test' }
			const presence = getDefaultUserPresence(store, user)

			expect(presence!.scribbles).toEqual([])
		})

		it('should handle default cursor state', () => {
			const user: TLPresenceUserInfo = { id: 'test' }
			const presence = getDefaultUserPresence(store, user)

			// Should combine pointer position with instance cursor properties
			expect(presence!.cursor!.x).toBeDefined()
			expect(presence!.cursor!.y).toBeDefined()
			expect(presence!.cursor!.type).toBeDefined()
			expect(presence!.cursor!.rotation).toBeDefined()
		})

		it('should handle multiple pages correctly', () => {
			// Create additional page
			const newPageId = 'page:second' as TLPageId
			store.put([
				PageRecordType.create({
					id: newPageId,
					name: 'Second Page',
					index: 'a2' as IndexKey,
					meta: {},
				}),
			])

			// Switch to new page
			const instance = store.get(TLINSTANCE_ID)!
			store.put([{ ...instance, currentPageId: newPageId }])

			// Integrity checker should create required records for new page
			const checker = createIntegrityChecker(store)
			checker()

			const user: TLPresenceUserInfo = { id: 'test' }
			const presence = getDefaultUserPresence(store, user)

			expect(presence!.currentPageId).toBe(newPageId)
		})
	})

	describe('type compatibility', () => {
		it('should return type compatible with TLPresenceStateInfo', () => {
			const user: TLPresenceUserInfo = { id: 'test', name: 'Test User', color: '#123456' }
			const presence = getDefaultUserPresence(store, user)

			// Should be usable with InstancePresenceRecordType.create
			expect(() =>
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('test'),
					...presence!,
				})
			).not.toThrow()
		})

		it('should satisfy TLPresenceStateInfo type requirements', () => {
			const user: TLPresenceUserInfo = { id: 'type-test' }
			const presence = getDefaultUserPresence(store, user)

			const stateInfo: TLPresenceStateInfo = presence!

			expect(stateInfo.userId).toBeDefined()
			expect(stateInfo.userName).toBeDefined()
			expect(stateInfo.currentPageId).toBeDefined()
			expect(stateInfo.selectedShapeIds).toBeDefined()
			expect(stateInfo.camera).toBeDefined()
			expect(stateInfo.cursor).toBeDefined()
			expect(stateInfo.color).toBeDefined()
			expect(stateInfo.meta).toBeDefined()
		})
	})

	describe('integration with multiplayer scenarios', () => {
		it('should provide data suitable for collaborative presence', () => {
			// Simulate user in active collaboration session
			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const instance = store.get(TLINSTANCE_ID)!
			const pageState = store.get(InstancePageStateRecordType.createId(pageId))!
			const pointer = store.get(TLPOINTER_ID)!

			store.put([
				{
					...instance,
					followingUserId: 'leader456',
					chatMessage: 'Following the design lead',
					screenBounds: { x: 0, y: 0, w: 2560, h: 1440 }, // Ultrawide monitor
				},
				{
					...pageState,
					selectedShapeIds: ['shape:header' as any, 'shape:logo' as any],
				},
				{
					...pointer,
					x: 1280,
					y: 720,
					lastActivityTimestamp: Date.now(),
				},
			])

			const collaborativeUser: TLPresenceUserInfo = {
				id: 'designer123',
				name: 'Alice Designer',
				color: '#FF6B6B',
			}

			const presence = getDefaultUserPresence(store, collaborativeUser)

			expect(presence!.followingUserId).toBe('leader456')
			expect(presence!.chatMessage).toBe('Following the design lead')
			expect(presence!.selectedShapeIds).toHaveLength(2)
			expect(presence!.cursor!.x).toBe(1280)
			expect(presence!.cursor!.y).toBe(720)
			expect(presence!.screenBounds!.w).toBe(2560)
			expect(presence!.lastActivityTimestamp).toBeGreaterThan(0)
		})

		it('should handle presence for different user roles', () => {
			const viewer: TLPresenceUserInfo = {
				id: 'viewer789',
				name: 'Bob Viewer',
				color: '#34C759',
			}

			const editor: TLPresenceUserInfo = {
				id: 'editor456',
				name: 'Charlie Editor',
				color: '#FF9500',
			}

			const viewerPresence = getDefaultUserPresence(store, viewer)
			const editorPresence = getDefaultUserPresence(store, editor)

			// Both should have valid presence but different user info
			expect(viewerPresence!.userId).toBe('viewer789')
			expect(viewerPresence!.color).toBe('#34C759')

			expect(editorPresence!.userId).toBe('editor456')
			expect(editorPresence!.color).toBe('#FF9500')

			// Should reflect same store state
			expect(viewerPresence!.currentPageId).toBe(editorPresence!.currentPageId)
		})
	})
})

describe('Integration between createPresenceStateDerivation and getDefaultUserPresence', () => {
	let store: Store<TLRecord, TLStoreProps>

	beforeEach(() => {
		const schema = createTLSchema()
		store = new Store({
			schema,
			props: {
				defaultName: 'Integration Test Store',
				assets: {
					upload: vi.fn().mockResolvedValue({ src: 'uploaded-url' }),
					resolve: vi.fn().mockResolvedValue('resolved-url'),
					remove: vi.fn().mockResolvedValue(undefined),
				},
				onMount: vi.fn(),
			},
		})

		const checker = createIntegrityChecker(store)
		checker()
	})

	it('should create consistent presence records', () => {
		const user: TLPresenceUserInfo = {
			id: 'integration-user',
			name: 'Integration User',
			color: '#9966CC',
		}

		// Test getDefaultUserPresence directly
		const directPresence = getDefaultUserPresence(store, user)

		// Test via createPresenceStateDerivation
		const userSignal = atom('integrationUser', user)
		const derivation = createPresenceStateDerivation(userSignal)
		const presenceSignal = derivation(store)
		const derivedPresence = presenceSignal.get()

		// Should have same data (excluding ID which is generated)
		expect(directPresence!.userId).toBe(derivedPresence!.userId)
		expect(directPresence!.userName).toBe(derivedPresence!.userName)
		expect(directPresence!.color).toBe(derivedPresence!.color)
		expect(directPresence!.currentPageId).toBe(derivedPresence!.currentPageId)
		expect(directPresence!.selectedShapeIds).toEqual(derivedPresence!.selectedShapeIds)
		expect(directPresence!.camera).toEqual(derivedPresence!.camera)
		expect(directPresence!.cursor).toEqual(derivedPresence!.cursor)
	})

	it('should handle edge cases consistently', () => {
		// Remove required records
		store.remove([TLPOINTER_ID])

		const user: TLPresenceUserInfo = { id: 'edge-case' }

		// Both should return null
		expect(getDefaultUserPresence(store, user)).toBe(null)

		const userSignal = atom('edgeCaseUser', user)
		const derivation = createPresenceStateDerivation(userSignal)
		expect(derivation(store).get()).toBe(null)
	})

	it('should maintain reactivity through the integration', () => {
		const userSignal = atom('reactiveUser', {
			id: 'reactive-user',
			name: 'Initial Name',
			color: '#000000',
		})

		const derivation = createPresenceStateDerivation(userSignal)
		const presenceSignal = derivation(store)

		// Initial state
		const initialPresence = presenceSignal.get()
		expect(initialPresence!.userName).toBe('Initial Name')

		// Update user
		userSignal.set({
			id: 'reactive-user',
			name: 'Updated Name',
			color: '#FFFFFF',
		})

		// Should reflect changes
		const updatedPresence = presenceSignal.get()
		expect(updatedPresence!.userName).toBe('Updated Name')
		expect(updatedPresence!.color).toBe('#FFFFFF')

		// Update store state
		const pageId = [...store.query.ids('page').get()][0] as TLPageId
		const pageState = store.get(InstancePageStateRecordType.createId(pageId))!
		store.put([
			{
				...pageState,
				selectedShapeIds: ['shape:reactive' as any],
			},
		])

		// Should reflect store changes
		const storeUpdatedPresence = presenceSignal.get()
		expect(storeUpdatedPresence!.selectedShapeIds).toEqual(['shape:reactive'])
		expect(storeUpdatedPresence!.userName).toBe('Updated Name') // User data preserved
	})
})
