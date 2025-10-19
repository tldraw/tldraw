// This module provides theme detection utilities for analytics components
// Since the analytics library is used on many sites, which all may use different themes,
// we use the most general way of detecting light or dark theme by checking the
// `color-scheme` CSS property on the `html` element.

import { AnalyticsState } from './state'

export class ThemeState extends AnalyticsState<'light' | 'dark'> {
	private observer: MutationObserver | null = null

	override initialize(): void {
		// If document is not available, default to light theme
		if (typeof document === 'undefined') {
			this.value = 'light'
			return
		}

		// Read initial theme from document
		const docElm = document.documentElement
		this.value = docElm.getAttribute('style')?.includes('color-scheme: dark') ? 'dark' : 'light'

		if (typeof MutationObserver === 'undefined') {
			// weird browser, we just won't set up the observer (we won't be able to detect theme changes)
		} else {
			const observer = new MutationObserver((mutations) => {
				if (mutations.some((mutation) => mutation.attributeName === 'style')) {
					this.setValue(
						docElm.getAttribute('style')?.includes('color-scheme: dark') ? 'dark' : 'light'
					)
				}
			})

			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['style'],
			})

			this.observer = observer
		}
	}
	override dispose() {
		if (this.observer) {
			this.observer.disconnect()
			this.observer = null
		}
	}
}
