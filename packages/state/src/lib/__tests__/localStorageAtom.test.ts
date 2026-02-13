import { localStorageAtom } from '../localStorageAtom'
import { getGlobalEpoch } from '../transactions'

// Mock localStorage
const mockLocalStorage = (() => {
	let store: Record<string, string> = {}

	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key]
		}),
		clear: vi.fn(() => {
			store = {}
		}),
		get length() {
			return Object.keys(store).length
		},
		key: vi.fn((index: number) => Object.keys(store)[index] || null),
		// Internal helper to reset store
		_reset: () => {
			store = {}
		},
	}
})()

// Mock the @tldraw/utils functions
vi.mock('@tldraw/utils', () => ({
	getFromLocalStorage: (key: string) => mockLocalStorage.getItem(key),
	setInLocalStorage: (key: string, value: string) => mockLocalStorage.setItem(key, value),
	deleteFromLocalStorage: (key: string) => mockLocalStorage.removeItem(key),
}))

describe('localStorageAtom', () => {
	beforeEach(() => {
		mockLocalStorage._reset()
		vi.clearAllMocks()
	})

	describe('initialization', () => {
		it('should create atom with initial value when localStorage is empty', () => {
			const [atom, cleanup] = localStorageAtom('test-key', 'initial-value')

			expect(atom.get()).toBe('initial-value')
			cleanup()
		})

		it('should restore value from localStorage when it exists', () => {
			mockLocalStorage.setItem('test-key', JSON.stringify('stored-value'))

			const [atom, cleanup] = localStorageAtom('test-key', 'initial-value')

			expect(atom.get()).toBe('stored-value')
			cleanup()
		})
	})

	describe('corrupted localStorage handling', () => {
		it('should use initial value and delete corrupted localStorage entry', () => {
			mockLocalStorage.setItem('test-key', 'invalid-json')

			const [atom, cleanup] = localStorageAtom('test-key', 'initial-value')

			expect(atom.get()).toBe('initial-value')
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key')
			cleanup()
		})

		it('should handle empty string in localStorage', () => {
			mockLocalStorage.setItem('test-key', '')

			const [atom, cleanup] = localStorageAtom('test-key', 'initial-value')

			// Empty string should be falsy, so initial value is used
			expect(atom.get()).toBe('initial-value')
			cleanup()
		})
	})

	describe('localStorage synchronization', () => {
		it('should save to localStorage when atom value changes', () => {
			const [atom, cleanup] = localStorageAtom('test-key', 'initial')

			atom.set('new-value')

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'))
			cleanup()
		})

		it('should update localStorage on multiple changes', () => {
			const [atom, cleanup] = localStorageAtom('counter', 0)

			// Clear initial call from atom creation
			vi.clearAllMocks()

			atom.set(1)
			atom.set(2)
			atom.set(3)

			expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3)
			expect(mockLocalStorage.setItem).toHaveBeenNthCalledWith(1, 'counter', JSON.stringify(1))
			expect(mockLocalStorage.setItem).toHaveBeenNthCalledWith(2, 'counter', JSON.stringify(2))
			expect(mockLocalStorage.setItem).toHaveBeenNthCalledWith(3, 'counter', JSON.stringify(3))
			cleanup()
		})
	})

	describe('cleanup functionality', () => {
		it('should stop syncing to localStorage after cleanup', () => {
			const [atom, cleanup] = localStorageAtom('test-key', 'initial')

			// Change value before cleanup - should sync
			atom.set('before-cleanup')
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				'test-key',
				JSON.stringify('before-cleanup')
			)

			// Clear mocks and cleanup
			vi.clearAllMocks()
			cleanup()

			// Change value after cleanup - should not sync
			atom.set('after-cleanup')
			expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
		})

		it('should allow atom to continue functioning after cleanup', () => {
			const [atom, cleanup] = localStorageAtom('test-key', 'initial')

			cleanup()

			atom.set('new-value')
			expect(atom.get()).toBe('new-value')
		})
	})

	describe('atom options', () => {
		it('should pass through atom options', () => {
			const isEqual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
			const [atom, cleanup] = localStorageAtom('test-key', 'Hello', { isEqual })

			atom.set('HELLO')
			expect(atom.get()).toBe('Hello') // Should use custom equality
			cleanup()
		})

		it('should work with history options', () => {
			const [atom, cleanup] = localStorageAtom('test-key', 0, {
				historyLength: 3,
				computeDiff: (a, b) => b - a,
			})

			const startEpoch = getGlobalEpoch()

			atom.set(5)
			atom.set(10)

			const diffs = atom.getDiffSince(startEpoch)
			expect(diffs).toEqual([5, 5])
			cleanup()
		})
	})

	describe('multiple instances', () => {
		it('should handle multiple atoms with different keys', () => {
			const [atom1, cleanup1] = localStorageAtom('key1', 'value1')
			const [atom2, cleanup2] = localStorageAtom('key2', 'value2')

			atom1.set('updated1')
			atom2.set('updated2')

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key1', JSON.stringify('updated1'))
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key2', JSON.stringify('updated2'))

			cleanup1()
			cleanup2()
		})
	})
})
