import { useEffect } from 'react'

/**
 * Hook to warn users when navigating away with unsaved changes.
 *
 * This hook intercepts navigation attempts in two ways:
 * 1. Browser navigation (back/forward, tab close, URL bar) via beforeunload event
 * 2. Next.js Link clicks via capture-phase click event listener
 *
 * @param hasUnsavedChanges - Whether there are unsaved changes that should trigger a warning
 * @param message - Optional custom warning message (only used for Link clicks, beforeunload uses browser default)
 *
 * @example
 * ```tsx
 * const [isDirty, setIsDirty] = useState(false)
 * useUnsavedChanges(isDirty)
 * ```
 */
export function useUnsavedChanges(hasUnsavedChanges: boolean, message?: string) {
	useEffect(() => {
		const defaultMessage = 'You have unsaved changes. Are you sure you want to leave?'
		const confirmationMessage = message || defaultMessage

		// Handle browser navigation (back/forward, tab close, URL bar)
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault()
				// Modern browsers ignore custom message and show generic warning
				e.returnValue = ''
			}
		}

		// Handle Next.js Link clicks by intercepting click events on anchor tags
		const handleClick = (e: MouseEvent) => {
			if (!hasUnsavedChanges) return

			const target = e.target as HTMLElement
			const link = target.closest('a')

			if (link) {
				const href = link.getAttribute('href')
				// Only intercept internal links (Next.js Link components)
				if (href?.startsWith('/')) {
					const confirmed = window.confirm(confirmationMessage)
					if (!confirmed) {
						e.preventDefault()
						e.stopPropagation()
					}
				}
			}
		}

		window.addEventListener('beforeunload', handleBeforeUnload)
		// Use capture phase to intercept before Next.js Link handlers
		document.addEventListener('click', handleClick, true)

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload)
			document.removeEventListener('click', handleClick, true)
		}
	}, [hasUnsavedChanges, message])
}
