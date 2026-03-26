import { atom, computed } from '@tldraw/state'
import { Store } from '@tldraw/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createPresenceStateDerivation,
	getDefaultUserPresence,
} from './createPresenceStateDerivation'
import { createTLSchema } from './createTLSchema'
import { TLINSTANCE_ID } from './records/TLInstance'
import { TLPageId } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { TLRecord } from './records/TLRecord'
import { createUserId, TLUser, UserRecordType } from './records/TLUser'
import { createIntegrityChecker, TLStoreProps } from './TLStore'

describe('createPresenceStateDerivation', () => {
	let store: Store<TLRecord, TLStoreProps>
	let userSignal: ReturnType<typeof atom<TLUser>>

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
				users: {
					currentUser: computed('currentUser', () => null),
					resolve: () => computed('resolve', () => null),
				},
				onMount: vi.fn(),
			},
		})

		// Initialize store with required records
		const checker = createIntegrityChecker(store)
		checker()

		userSignal = atom(
			'user',
			UserRecordType.create({
				id: createUserId('user123'),
				name: 'Test User',
				color: '#007AFF',
			})
		)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('basic functionality', () => {
		it('should create presence state and be reactive to changes', () => {
			const derivation = createPresenceStateDerivation(userSignal)
			const presenceSignal = derivation(store)
			const presence = presenceSignal.get()

			expect(presence!.userId).toBe('user:user123')
			expect(presence!.userName).toBe('Test User')
			expect(presence!.color).toBe('#007AFF')

			// Update user signal
			userSignal.set(
				UserRecordType.create({
					id: createUserId('user456'),
					name: 'Updated User',
					color: '#FF6B6B',
				})
			)

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
				users: {
					currentUser: computed('currentUser', () => null),
					resolve: () => computed('resolve', () => null),
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
			const user = UserRecordType.create({
				id: createUserId('test-user'),
				name: 'Test User',
				color: '#00FF00',
			})

			const presence = getDefaultUserPresence(store, user)

			expect(presence!.userId).toBe('user:test-user')
			expect(presence!.userName).toBe('Test User')
			expect(presence!.color).toBe('#00FF00')
		})

		it('should use defaults for missing user fields', () => {
			const minimalUser = UserRecordType.create({ id: createUserId('minimal') })
			const presence = getDefaultUserPresence(store, minimalUser)

			expect(presence!.userName).toBe('')
			expect(presence!.color).toBe('#FF0000')
		})
	})

	describe('error conditions', () => {
		it('should return null when required records are missing', () => {
			store.remove([TLINSTANCE_ID])
			const user = UserRecordType.create({ id: createUserId('test') })
			expect(getDefaultUserPresence(store, user)).toBe(null)
		})
	})
})
