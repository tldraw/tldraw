import { atom } from '@tldraw/state'
import { Mocked, vi } from 'vitest'
import { TLUserPreferences, defaultUserPreferences } from '../../../config/TLUserPreferences'
import { TLUser } from '../../../config/createTLUser'
import { UserPreferencesManager } from './UserPreferencesManager'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()
window.matchMedia = mockMatchMedia

describe('UserPreferencesManager', () => {
	let mockUser: Mocked<TLUser>
	let mockUserPreferences: TLUserPreferences
	let userPreferencesAtom: any
	let userPreferencesManager: UserPreferencesManager

	const createMockUserPreferences = (
		overrides: Partial<TLUserPreferences> = {}
	): TLUserPreferences => ({
		id: 'test-user-id',
		name: 'Test User',
		color: '#FF802B',
		locale: 'en',
		animationSpeed: 1,
		areKeyboardShortcutsEnabled: true,
		enhancedA11yMode: false,
		edgeScrollSpeed: 1,
		colorScheme: 'light',
		isSnapMode: false,
		isWrapMode: false,
		isDynamicSizeMode: false,
		isPasteAtCursorMode: false,
		inputMode: null,
		...overrides,
	})

	beforeEach(() => {
		vi.clearAllMocks()

		mockUserPreferences = createMockUserPreferences()
		userPreferencesAtom = atom('userPreferences', mockUserPreferences)

		mockUser = {
			userPreferences: userPreferencesAtom,
			setUserPreferences: vi.fn((prefs) => {
				userPreferencesAtom.set(prefs)
			}),
		}

		// Default matchMedia mock - no dark mode preference
		mockMatchMedia.mockReturnValue({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})
	})

	describe('constructor', () => {
		it('should initialize with light system color scheme when matchMedia not available', () => {
			// Test when window.matchMedia is not available
			delete (window as any).matchMedia

			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			expect(userPreferencesManager.systemColorScheme.get()).toBe('light')

			// Restore matchMedia
			window.matchMedia = mockMatchMedia
		})

		it('should initialize with light system color scheme when dark mode not preferred', () => {
			mockMatchMedia.mockReturnValue({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})

			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			expect(userPreferencesManager.systemColorScheme.get()).toBe('light')
		})

		it('should initialize with dark system color scheme when dark mode preferred', () => {
			mockMatchMedia.mockReturnValue({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})

			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			expect(userPreferencesManager.systemColorScheme.get()).toBe('dark')
		})

		it('should set up media query listener for color scheme changes', () => {
			const mockAddEventListener = vi.fn()
			const mockRemoveEventListener = vi.fn()

			mockMatchMedia.mockReturnValue({
				matches: false,
				addEventListener: mockAddEventListener,
				removeEventListener: mockRemoveEventListener,
			})

			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
		})

		it('should handle media query change events', () => {
			const mockAddEventListener = vi.fn()
			let changeHandler: (e: MediaQueryListEvent) => void

			mockMatchMedia.mockReturnValue({
				matches: false,
				addEventListener: (event: string, handler: any) => {
					if (event === 'change') {
						changeHandler = handler
					}
					mockAddEventListener(event, handler)
				},
				removeEventListener: vi.fn(),
			})

			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			expect(userPreferencesManager.systemColorScheme.get()).toBe('light')

			// Simulate dark mode change
			changeHandler!({ matches: true } as MediaQueryListEvent)
			expect(userPreferencesManager.systemColorScheme.get()).toBe('dark')

			// Simulate light mode change
			changeHandler!({ matches: false } as MediaQueryListEvent)
			expect(userPreferencesManager.systemColorScheme.get()).toBe('light')
		})

		it('should work in server environment (no window)', () => {
			const originalWindow = global.window
			delete (global as any).window

			expect(() => {
				userPreferencesManager = new UserPreferencesManager(mockUser, false)
			}).not.toThrow()

			global.window = originalWindow
		})
	})

	describe('dispose', () => {
		it('should remove media query listener on dispose', () => {
			const mockRemoveEventListener = vi.fn()

			mockMatchMedia.mockReturnValue({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: mockRemoveEventListener,
			})

			userPreferencesManager = new UserPreferencesManager(mockUser, false)
			userPreferencesManager.dispose()

			expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
		})

		it('should call all disposables', () => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			const mockDisposable1 = vi.fn()
			const mockDisposable2 = vi.fn()

			userPreferencesManager.disposables.add(mockDisposable1)
			userPreferencesManager.disposables.add(mockDisposable2)

			userPreferencesManager.dispose()

			expect(mockDisposable1).toHaveBeenCalled()
			expect(mockDisposable2).toHaveBeenCalled()
		})
	})

	describe('updateUserPreferences', () => {
		beforeEach(() => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)
		})

		it('should update user preferences with partial data', () => {
			const updates = { name: 'Updated Name', color: '#EC5E41' }

			userPreferencesManager.updateUserPreferences(updates)

			expect(mockUser.setUserPreferences).toHaveBeenCalledWith({
				...mockUserPreferences,
				...updates,
			})
		})

		it('should preserve existing preferences when updating', () => {
			const updates = { animationSpeed: 0.5 }

			userPreferencesManager.updateUserPreferences(updates)

			expect(mockUser.setUserPreferences).toHaveBeenCalledWith({
				...mockUserPreferences,
				animationSpeed: 0.5,
			})
		})

		it('should handle empty updates', () => {
			userPreferencesManager.updateUserPreferences({})

			expect(mockUser.setUserPreferences).toHaveBeenCalledWith(mockUserPreferences)
		})
	})

	describe('getUserPreferences', () => {
		beforeEach(() => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)
		})

		it('should return complete user preferences with computed values', () => {
			const result = userPreferencesManager.getUserPreferences()

			expect(result).toEqual({
				id: mockUserPreferences.id,
				name: mockUserPreferences.name,
				locale: mockUserPreferences.locale,
				color: mockUserPreferences.color,
				animationSpeed: mockUserPreferences.animationSpeed,
				areKeyboardShortcutsEnabled: mockUserPreferences.areKeyboardShortcutsEnabled,
				enhancedA11yMode: mockUserPreferences.enhancedA11yMode,
				isSnapMode: mockUserPreferences.isSnapMode,
				colorScheme: mockUserPreferences.colorScheme,
				isDarkMode: false, // light mode
				isWrapMode: mockUserPreferences.isWrapMode,
				isDynamicResizeMode: mockUserPreferences.isDynamicSizeMode,
				inputMode: mockUserPreferences.inputMode,
			})
		})

		it('should use default values for missing properties', () => {
			const minimalPrefs: TLUserPreferences = { id: 'test-id' }
			userPreferencesAtom.set(minimalPrefs)

			const result = userPreferencesManager.getUserPreferences()

			expect(result.name).toBe(defaultUserPreferences.name)
			expect(result.color).toBe(defaultUserPreferences.color)
			expect(result.locale).toBe(defaultUserPreferences.locale)
			expect(result.animationSpeed).toBe(defaultUserPreferences.animationSpeed)
		})
	})

	describe('getIsDarkMode', () => {
		beforeEach(() => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)
		})

		it('should return true when colorScheme is dark', () => {
			userPreferencesAtom.set({ ...mockUserPreferences, colorScheme: 'dark' })

			expect(userPreferencesManager.getIsDarkMode()).toBe(true)
		})

		it('should return false when colorScheme is light', () => {
			userPreferencesAtom.set({ ...mockUserPreferences, colorScheme: 'light' })

			expect(userPreferencesManager.getIsDarkMode()).toBe(false)
		})

		it('should follow system preference when colorScheme is system', () => {
			userPreferencesAtom.set({ ...mockUserPreferences, colorScheme: 'system' })

			// System is light
			userPreferencesManager.systemColorScheme.set('light')
			expect(userPreferencesManager.getIsDarkMode()).toBe(false)

			// System is dark
			userPreferencesManager.systemColorScheme.set('dark')
			expect(userPreferencesManager.getIsDarkMode()).toBe(true)
		})

		it('should use inferDarkMode when colorScheme is undefined', () => {
			userPreferencesAtom.set({ ...mockUserPreferences, colorScheme: undefined })

			// With inferDarkMode = true
			const managerWithInfer = new UserPreferencesManager(mockUser, true)
			managerWithInfer.systemColorScheme.set('dark')
			expect(managerWithInfer.getIsDarkMode()).toBe(true)

			// With inferDarkMode = false
			const managerWithoutInfer = new UserPreferencesManager(mockUser, false)
			managerWithoutInfer.systemColorScheme.set('dark')
			expect(managerWithoutInfer.getIsDarkMode()).toBe(false)
		})
	})

	describe('individual preference getters', () => {
		beforeEach(() => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)
		})

		describe('getId', () => {
			it('should return user id', () => {
				expect(userPreferencesManager.getId()).toBe(mockUserPreferences.id)
			})
		})

		describe('getName', () => {
			it('should return trimmed user name', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, name: '  Test User  ' })
				expect(userPreferencesManager.getName()).toBe('Test User')
			})

			it('should return default name when name is null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, name: null })
				expect(userPreferencesManager.getName()).toBe(defaultUserPreferences.name)
			})

			it('should return default name when name is undefined', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, name: undefined })
				expect(userPreferencesManager.getName()).toBe(defaultUserPreferences.name)
			})

			it('should return default name when name is empty after trimming', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, name: '   ' })
				expect(userPreferencesManager.getName()).toBe(defaultUserPreferences.name)
			})
		})

		describe('getLocale', () => {
			it('should return user locale', () => {
				expect(userPreferencesManager.getLocale()).toBe(mockUserPreferences.locale)
			})

			it('should return default locale when locale is null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, locale: null })
				expect(userPreferencesManager.getLocale()).toBe(defaultUserPreferences.locale)
			})
		})

		describe('getColor', () => {
			it('should return user color', () => {
				expect(userPreferencesManager.getColor()).toBe(mockUserPreferences.color)
			})

			it('should return default color when color is null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, color: null })
				expect(userPreferencesManager.getColor()).toBe(defaultUserPreferences.color)
			})
		})

		describe('getAnimationSpeed', () => {
			it('should return user animation speed', () => {
				expect(userPreferencesManager.getAnimationSpeed()).toBe(mockUserPreferences.animationSpeed)
			})

			it('should return default animation speed when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, animationSpeed: null })
				expect(userPreferencesManager.getAnimationSpeed()).toBe(
					defaultUserPreferences.animationSpeed
				)
			})
		})

		describe('getAreKeyboardShortcutsEnabled', () => {
			it('should return user keyboard shortcuts', () => {
				expect(userPreferencesManager.getAreKeyboardShortcutsEnabled()).toBe(
					mockUserPreferences.areKeyboardShortcutsEnabled
				)
			})

			it('should return default keyboard shortcuts when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, areKeyboardShortcutsEnabled: null })
				expect(userPreferencesManager.getAreKeyboardShortcutsEnabled()).toBe(
					defaultUserPreferences.areKeyboardShortcutsEnabled
				)
			})
		})

		describe('getEnhancedA11yMode', () => {
			it('should return user enhanced a11y mode setting', () => {
				expect(userPreferencesManager.getEnhancedA11yMode()).toBe(
					mockUserPreferences.enhancedA11yMode
				)
			})

			it('should return default enhanced a11y mode when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, enhancedA11yMode: null })
				expect(userPreferencesManager.getEnhancedA11yMode()).toBe(
					defaultUserPreferences.enhancedA11yMode
				)
			})
		})

		describe('getEdgeScrollSpeed', () => {
			it('should return user edge scroll speed', () => {
				expect(userPreferencesManager.getEdgeScrollSpeed()).toBe(
					mockUserPreferences.edgeScrollSpeed
				)
			})

			it('should return default edge scroll speed when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, edgeScrollSpeed: null })
				expect(userPreferencesManager.getEdgeScrollSpeed()).toBe(
					defaultUserPreferences.edgeScrollSpeed
				)
			})
		})

		describe('getIsSnapMode', () => {
			it('should return user snap mode setting', () => {
				expect(userPreferencesManager.getIsSnapMode()).toBe(mockUserPreferences.isSnapMode)
			})

			it('should return default snap mode when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, isSnapMode: null })
				expect(userPreferencesManager.getIsSnapMode()).toBe(defaultUserPreferences.isSnapMode)
			})
		})

		describe('getIsWrapMode', () => {
			it('should return user wrap mode setting', () => {
				expect(userPreferencesManager.getIsWrapMode()).toBe(mockUserPreferences.isWrapMode)
			})

			it('should return default wrap mode when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, isWrapMode: null })
				expect(userPreferencesManager.getIsWrapMode()).toBe(defaultUserPreferences.isWrapMode)
			})
		})

		describe('getIsDynamicResizeMode', () => {
			it('should return user dynamic resize mode setting', () => {
				expect(userPreferencesManager.getIsDynamicResizeMode()).toBe(
					mockUserPreferences.isDynamicSizeMode
				)
			})

			it('should return default dynamic resize mode when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, isDynamicSizeMode: null })
				expect(userPreferencesManager.getIsDynamicResizeMode()).toBe(
					defaultUserPreferences.isDynamicSizeMode
				)
			})
		})

		describe('getIsPasteAtCursorMode', () => {
			it('should return user paste at cursor mode setting', () => {
				expect(userPreferencesManager.getIsPasteAtCursorMode()).toBe(
					mockUserPreferences.isPasteAtCursorMode
				)
			})

			it('should return default paste at cursor mode when null', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, isPasteAtCursorMode: null })
				expect(userPreferencesManager.getIsPasteAtCursorMode()).toBe(
					defaultUserPreferences.isPasteAtCursorMode
				)
			})
		})

		describe('getInputMode', () => {
			it('should return user input mode setting', () => {
				expect(userPreferencesManager.getInputMode()).toBe(null)
			})

			it('should return trackpad if input mode is trackpad', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, inputMode: 'trackpad' })
				expect(userPreferencesManager.getInputMode()).toBe('trackpad')
			})

			it('should return mouse if input mode is mouse', () => {
				userPreferencesAtom.set({ ...mockUserPreferences, inputMode: 'mouse' })
				expect(userPreferencesManager.getInputMode()).toBe('mouse')
			})
		})
	})

	describe('reactive behavior', () => {
		beforeEach(() => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)
		})

		it('should react to user preferences changes', () => {
			expect(userPreferencesManager.getName()).toBe('Test User')

			userPreferencesManager.updateUserPreferences({ name: 'Updated User' })

			expect(userPreferencesManager.getName()).toBe('Updated User')
		})

		it('should react to system color scheme changes', () => {
			userPreferencesAtom.set({ ...mockUserPreferences, colorScheme: 'system' })

			expect(userPreferencesManager.getIsDarkMode()).toBe(false)

			userPreferencesManager.systemColorScheme.set('dark')

			expect(userPreferencesManager.getIsDarkMode()).toBe(true)
		})

		it('should update getUserPreferences when individual preferences change', () => {
			const initialPrefs = userPreferencesManager.getUserPreferences()
			expect(initialPrefs.name).toBe('Test User')

			userPreferencesManager.updateUserPreferences({ name: 'Changed Name' })

			const updatedPrefs = userPreferencesManager.getUserPreferences()
			expect(updatedPrefs.name).toBe('Changed Name')
		})
	})

	describe('edge cases and error handling', () => {
		beforeEach(() => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)
		})

		it('should handle undefined user preferences gracefully', () => {
			userPreferencesAtom.set({} as TLUserPreferences)

			expect(() => userPreferencesManager.getUserPreferences()).not.toThrow()
			expect(userPreferencesManager.getName()).toBe(defaultUserPreferences.name)
			expect(userPreferencesManager.getColor()).toBe(defaultUserPreferences.color)
		})

		it('should handle null values in preferences', () => {
			const nullPrefs = createMockUserPreferences({
				name: null,
				color: null,
				locale: null,
				animationSpeed: null,
				areKeyboardShortcutsEnabled: null,
				edgeScrollSpeed: null,
				isSnapMode: null,
				isWrapMode: null,
				isDynamicSizeMode: null,
				isPasteAtCursorMode: null,
			})

			userPreferencesAtom.set(nullPrefs)

			expect(userPreferencesManager.getName()).toBe(defaultUserPreferences.name)
			expect(userPreferencesManager.getColor()).toBe(defaultUserPreferences.color)
			expect(userPreferencesManager.getLocale()).toBe(defaultUserPreferences.locale)
			expect(userPreferencesManager.getAnimationSpeed()).toBe(defaultUserPreferences.animationSpeed)
			expect(userPreferencesManager.getAreKeyboardShortcutsEnabled()).toBe(
				defaultUserPreferences.areKeyboardShortcutsEnabled
			)
			expect(userPreferencesManager.getEdgeScrollSpeed()).toBe(
				defaultUserPreferences.edgeScrollSpeed
			)
			expect(userPreferencesManager.getIsSnapMode()).toBe(defaultUserPreferences.isSnapMode)
			expect(userPreferencesManager.getIsWrapMode()).toBe(defaultUserPreferences.isWrapMode)
			expect(userPreferencesManager.getIsDynamicResizeMode()).toBe(
				defaultUserPreferences.isDynamicSizeMode
			)
			expect(userPreferencesManager.getIsPasteAtCursorMode()).toBe(
				defaultUserPreferences.isPasteAtCursorMode
			)
		})

		it('should handle matchMedia with null response', () => {
			// Mock matchMedia returning null (like in some environments)
			mockMatchMedia.mockReturnValue(null)

			expect(() => {
				userPreferencesManager = new UserPreferencesManager(mockUser, false)
			}).not.toThrow()

			expect(userPreferencesManager.systemColorScheme.get()).toBe('light')
		})

		it('should handle dispose gracefully in all cases', () => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			// Should not throw even if dispose is called multiple times
			expect(() => userPreferencesManager.dispose()).not.toThrow()
			expect(() => userPreferencesManager.dispose()).not.toThrow()
		})

		it('should handle empty disposables set', () => {
			// Test in server environment where no event listeners are added
			const originalWindow = global.window
			delete (global as any).window

			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			expect(() => userPreferencesManager.dispose()).not.toThrow()
			expect(userPreferencesManager.disposables.size).toBe(0)

			global.window = originalWindow
		})
	})

	describe('integration scenarios', () => {
		it('should work with real-world preference scenarios', () => {
			userPreferencesManager = new UserPreferencesManager(mockUser, true)

			// User starts with system preference
			userPreferencesManager.updateUserPreferences({ colorScheme: 'system' })
			userPreferencesManager.systemColorScheme.set('dark')

			expect(userPreferencesManager.getIsDarkMode()).toBe(true)
			expect(userPreferencesManager.getUserPreferences().isDarkMode).toBe(true)

			// User switches to light mode explicitly
			userPreferencesManager.updateUserPreferences({ colorScheme: 'light' })

			expect(userPreferencesManager.getIsDarkMode()).toBe(false)
			expect(userPreferencesManager.getUserPreferences().isDarkMode).toBe(false)

			// System changes but user preference is respected
			userPreferencesManager.systemColorScheme.set('light')

			expect(userPreferencesManager.getIsDarkMode()).toBe(false)
		})

		it('should handle preference updates with multiple fields', () => {
			userPreferencesManager = new UserPreferencesManager(mockUser, false)

			const updates = {
				name: 'New User',
				color: '#F2555A',
				animationSpeed: 0.5,
				isSnapMode: true,
				colorScheme: 'dark' as const,
			}

			userPreferencesManager.updateUserPreferences(updates)

			const prefs = userPreferencesManager.getUserPreferences()

			expect(prefs.name).toBe('New User')
			expect(prefs.color).toBe('#F2555A')
			expect(prefs.animationSpeed).toBe(0.5)
			expect(prefs.isSnapMode).toBe(true)
			expect(prefs.colorScheme).toBe('dark')
			expect(prefs.isDarkMode).toBe(true)
		})
	})
})
