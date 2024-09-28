'use client'

import { ArrowLongUpIcon } from '@heroicons/react/20/solid'
import { useEffect, useState } from 'react'

export function BackToTopButton() {
	const [showButton, setShowButton] = useState<boolean>(false)

	useEffect(() => {
		const handleScroll = () => setShowButton(window.scrollY > 500)
		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	if (showButton)
		return (
			<button
				onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
				className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 dark:hover:bg-blue-400"
			>
				<ArrowLongUpIcon className="h-3.5 -mr-px" />
				<span>Scroll to top</span>
			</button>
		)

	return null
}
