import { useEffect, useState } from 'react'
import { useEditor } from 'tldraw'

export function useMobilePositioning(isMobile: boolean) {
	const editor = useEditor()
	const [mobileMenuOffset, setMobileMenuOffset] = useState<number | null>(null)

	// Position HUD above mobile style menu button on mobile
	useEffect(() => {
		if (!isMobile) {
			setMobileMenuOffset(null)
			return
		}

		const updatePosition = () => {
			const mobileStyleButton = document.querySelector('[data-testid="mobile-styles.button"]')
			if (mobileStyleButton) {
				const buttonRect = mobileStyleButton.getBoundingClientRect()
				if (editor.getContainer().clientWidth < 500) {
					setMobileMenuOffset(4)
				} else {
					const rightOffset = window.innerWidth - buttonRect.right
					setMobileMenuOffset(rightOffset)
				}
				return
			}
			setMobileMenuOffset(null)
		}

		updatePosition()

		editor.on('resize', updatePosition)
		return () => {
			editor.off('resize', updatePosition)
		}
	}, [isMobile, editor])

	return { mobileMenuOffset }
}
