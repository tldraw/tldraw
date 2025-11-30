import { useEffect, useState } from 'react'

export function useMobilePositioning(isMobile: boolean) {
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
				const rightOffset = window.innerWidth - buttonRect.right
				setMobileMenuOffset(rightOffset)
				return
			}
			setMobileMenuOffset(null)
		}

		updatePosition()

		window.addEventListener('resize', updatePosition)

		return () => window.removeEventListener('resize', updatePosition)
	}, [isMobile])

	return { mobileMenuOffset }
}
