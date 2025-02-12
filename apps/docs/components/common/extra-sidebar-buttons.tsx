'use client'

import { ReactNode, useEffect, useState } from 'react'

export function ExtraSideBarButtons({ children }: { children?: ReactNode }) {
	const [showExtras, setShowExtras] = useState<boolean>(false)

	useEffect(() => {
		const handleScroll = () => setShowExtras(window.scrollY > 500)
		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	if (!showExtras) return null

	return <div className="mb-12 shrink-0 text-xs flex flex-col gap-4">{children}</div>
}
