// This module provides theme detection utilities for analytics components
// Since the analytics library is used on many sites, which all may use different themes,
// we use the most general way of detecting light or dark theme by checking the
// `color-scheme` CSS property on the `html` element.

export const documentThemeState = {
	_theme: 'light' as 'light' | 'dark',
	_initialized: false,
	_observer: null as MutationObserver | null,
	_listeners: new Set<(theme: 'light' | 'dark') => void>(),
	subscribe(listener: (theme: 'light' | 'dark') => void) {
		this._listeners.add(listener)
		return () => this._listeners.delete(listener)
	},
	notify() {
		this._listeners.forEach((listener) => listener(this._theme))
	},
	initialize() {
		if (this._initialized) return

		// If document is not available, default to light theme
		if (typeof document === 'undefined') {
			this._theme = 'light'
			this.notify()
			return
		}

		// Read initial theme from document
		const docElm = document.documentElement
		this._theme = docElm.getAttribute('style')?.includes('color-scheme: dark') ? 'dark' : 'light'

		if (typeof MutationObserver === 'undefined') {
			// we just won't set up the observer
		} else {
			const observer = new MutationObserver((mutations) => {
				if (mutations.some((mutation) => mutation.attributeName === 'style')) {
					this._theme = docElm.getAttribute('style')?.includes('color-scheme: dark')
						? 'dark'
						: 'light'
					this.notify()
				}
			})

			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['style'],
			})

			this._observer = observer
		}

		this._initialized = true
	},
	dispose() {
		if (this._observer) {
			this._observer.disconnect()
			this._observer = null
		}
		this._initialized = false
	},
	getCurrentTheme() {
		return this._theme
	},
}
