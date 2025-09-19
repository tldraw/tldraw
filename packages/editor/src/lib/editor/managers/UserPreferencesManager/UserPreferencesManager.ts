import { atom, computed } from '@tldraw/state'
import { TLUserPreferences, defaultUserPreferences } from '../../../config/TLUserPreferences'
import { TLUser } from '../../../config/createTLUser'

/** @public */
export class UserPreferencesManager {
	systemColorScheme = atom<'dark' | 'light'>('systemColorScheme', 'light')
	disposables = new Set<() => void>()
	dispose() {
		this.disposables.forEach((d) => d())
	}
	constructor(
		private readonly user: TLUser,
		private readonly inferDarkMode: boolean
	) {
		if (typeof window === 'undefined' || !window.matchMedia) return

		const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		if (darkModeMediaQuery?.matches) {
			this.systemColorScheme.set('dark')
		}
		const handleChange = (e: MediaQueryListEvent) => {
			if (e.matches) {
				this.systemColorScheme.set('dark')
			} else {
				this.systemColorScheme.set('light')
			}
		}
		darkModeMediaQuery?.addEventListener('change', handleChange)
		this.disposables.add(() => darkModeMediaQuery?.removeEventListener('change', handleChange))
	}

	updateUserPreferences(userPreferences: Partial<TLUserPreferences>) {
		this.user.setUserPreferences({
			...this.user.userPreferences.get(),
			...userPreferences,
		})
	}
	@computed getUserPreferences() {
		return {
			id: this.getId(),
			name: this.getName(),
			locale: this.getLocale(),
			color: this.getColor(),
			animationSpeed: this.getAnimationSpeed(),
			areKeyboardShortcutsEnabled: this.getAreKeyboardShortcutsEnabled(),
			isSnapMode: this.getIsSnapMode(),
			colorScheme: this.user.userPreferences.get().colorScheme,
			isDarkMode: this.getIsDarkMode(),
			isWrapMode: this.getIsWrapMode(),
			isDynamicResizeMode: this.getIsDynamicResizeMode(),
			enhancedA11yMode: this.getEnhancedA11yMode(),
			inputMode: this.getInputMode(),
		}
	}

	@computed getIsDarkMode() {
		switch (this.user.userPreferences.get().colorScheme) {
			case 'dark':
				return true
			case 'light':
				return false
			case 'system':
				return this.systemColorScheme.get() === 'dark'
			default:
				return this.inferDarkMode ? this.systemColorScheme.get() === 'dark' : false
		}
	}

	/**
	 * The speed at which the user can scroll by dragging toward the edge of the screen.
	 */
	@computed getEdgeScrollSpeed() {
		return this.user.userPreferences.get().edgeScrollSpeed ?? defaultUserPreferences.edgeScrollSpeed
	}

	@computed getAnimationSpeed() {
		return this.user.userPreferences.get().animationSpeed ?? defaultUserPreferences.animationSpeed
	}

	@computed getAreKeyboardShortcutsEnabled() {
		return (
			this.user.userPreferences.get().areKeyboardShortcutsEnabled ??
			defaultUserPreferences.areKeyboardShortcutsEnabled
		)
	}

	@computed getId() {
		return this.user.userPreferences.get().id
	}

	@computed getName() {
		return this.user.userPreferences.get().name?.trim() ?? defaultUserPreferences.name
	}

	@computed getLocale() {
		return this.user.userPreferences.get().locale ?? defaultUserPreferences.locale
	}

	@computed getColor() {
		return this.user.userPreferences.get().color ?? defaultUserPreferences.color
	}

	@computed getIsSnapMode() {
		return this.user.userPreferences.get().isSnapMode ?? defaultUserPreferences.isSnapMode
	}

	@computed getIsWrapMode() {
		return this.user.userPreferences.get().isWrapMode ?? defaultUserPreferences.isWrapMode
	}

	@computed getIsDynamicResizeMode() {
		return (
			this.user.userPreferences.get().isDynamicSizeMode ?? defaultUserPreferences.isDynamicSizeMode
		)
	}

	@computed getIsPasteAtCursorMode() {
		return (
			this.user.userPreferences.get().isPasteAtCursorMode ??
			defaultUserPreferences.isPasteAtCursorMode
		)
	}

	@computed getEnhancedA11yMode() {
		return (
			this.user.userPreferences.get().enhancedA11yMode ?? defaultUserPreferences.enhancedA11yMode
		)
	}

	@computed getInputMode() {
		return this.user.userPreferences.get().inputMode ?? defaultUserPreferences.inputMode
	}
}
