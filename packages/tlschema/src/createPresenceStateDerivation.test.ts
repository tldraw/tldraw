import { atom } from '@tldraw/state'
import { Store } from '@tldraw/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createPresenceStateDerivation,
	getDefaultUserPresence,
	TLPresenceUserInfo,
} from './createPresenceStateDerivation'
import { createTLSchema } from './createTLSchema'
import { TLINSTANCE_ID } from './records/TLInstance'
import { TLPageId } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { TLRecord } from './records/TLRecord'
import { createIntegrityChecker, TLStoreProps } from './TLStore'

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
		it('should create presence state and be reactive to changes', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence!.userId).toBe('user123')
			expect(presence!.userName).toBe('Test User')
			expect(presence!.color).toBe('#007AFF')

			// Update user signal
			userSignal.set({
				id: 'user456',
				name: 'Updated User',
				color: '#FF6B6B',
			})

			const updatedPresence = presenceSignal.get()
			expect(updatedPresence!.userName).toBe('Updated User')
			expect(updatedPresence!.color).toBe('#FF6B6B')
		})

		it('should return null when required records are missing', () => {
			store.remove([TLINSTANCE_ID])

			const derivation = createPresenceStateDerivation(userSignal)
			expect(derivation(store).get()).toBe(null)
		})
	})

	describe('store state integration', () => {
		it('should be reactive to store changes', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)

			const pageId = [...store.query.ids('page').get()][0] as TLPageId
			const pageState = store.get(InstancePageStateRecordType.createId(pageId))!
			store.put([
				{
					...pageState,
					selectedShapeIds: ['shape:test' as any],
				},
			])

			const presence = presenceSignal.get()
			expect(presence!.selectedShapeIds).toEqual(['shape:test'])
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
		it('should return presence state with user info and default values', () => {
			const user: TLPresenceUserInfo = {
				id: 'test-user',
				name: 'Test User',
				color: '#00FF00',
			}

			const presence = getDefaultUserPresence(store, user)

			expect(presence!.userId).toBe('test-user')
			expect(presence!.userName).toBe('Test User')
			expect(presence!.color).toBe('#00FF00')
		})

		it('should use defaults for missing user fields', () => {
			const minimalUser: TLPresenceUserInfo = { id: 'minimal' }
			const presence = getDefaultUserPresence(store, minimalUser)

			expect(presence!.userName).toBe('')
			expect(presence!.color).toBe('#FF0000')
		})
	})

	describe('error conditions', () => {
		it('should return null when required records are missing', () => {
			store.remove([TLINSTANCE_ID])
			const user: TLPresenceUserInfo = { id: 'test' }
			expect(getDefaultUserPresence(store, user)).toBe(null)
		})
	})
})
