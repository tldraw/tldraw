import { useEffect, useRef, useState } from 'react'
import { useEditor } from 'tldraw'

export function useMobilePositioning(isMobile: boolean) {
	const editor = useEditor()
	const [mobileMenuOffset, setMobileMenuOffset] = useState<number | null>(null)
	const cleanupRef = useRef<(() => void) | null>(null)

	// Position HUD above mobile style menu button on mobile
	useEffect(() => {
		// Clean up previous effect if it exists
		if (cleanupRef.current) {
			cleanupRef.current()
			cleanupRef.current = null
		}

		if (!isMobile) {
			setMobileMenuOffset(null)
			return
		}

		const currentEditor = editor
		const updatePosition = () => {
			const mobileStyleButton = document.querySelector('[data-testid="mobile-styles.button"]')
			if (mobileStyleButton) {
				try {
					const buttonRect = mobileStyleButton.getBoundingClientRect()
					if (currentEditor.getContainer().clientWidth < 500) {
						setMobileMenuOffset(4)
					} else {
						const rightOffset = window.innerWidth - buttonRect.right
						setMobileMenuOffset(rightOffset)
					}
					return
				} catch {
					// Editor may have been disposed
					setMobileMenuOffset(null)
				}
			}
			setMobileMenuOffset(null)
		}

		updatePosition()

		currentEditor.on('resize', updatePosition)
		cleanupRef.current = () => {
			try {
				currentEditor.off('resize', updatePosition)
			} catch {
				// Editor may have been disposed, ignore
			}
		}

		return () => {
			if (cleanupRef.current) {
				cleanupRef.current()
				cleanupRef.current = null
			}
		}
	}, [isMobile, editor])

	return { mobileMenuOffset }
}
