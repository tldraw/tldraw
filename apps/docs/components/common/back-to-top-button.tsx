'use client'

import { ArrowLongUpIcon } from '@heroicons/react/20/solid'

export function BackToTopButton() {
	return (
		<button
			id="back-to-top"
			onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
			className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 dark:hover:bg-blue-400"
		>
			<ArrowLongUpIcon className="h-3.5 -mr-px" />
			<span>Scroll to top</span>
		</button>
	)
}
