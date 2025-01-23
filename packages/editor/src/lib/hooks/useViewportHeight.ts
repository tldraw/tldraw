import { useLayoutEffect, useState } from 'react'

/*!
 * BSD License: https://github.com/outline/rich-markdown-editor/blob/main/LICENSE
 * Copyright (c) 2020 General Outline, Inc (https://www.getoutline.com/) and individual contributors.
 *
 * Returns the height of the viewport.
 * This is mainly to account for virtual keyboards on mobile devices.
 *
 * N.B. On iOS, you have to take into account the offsetTop as well so that you get an accurate position
 * while using the virtual keyboard.
 */
/** @public */
export function useViewportHeight(): number {
	const visualViewport = window.visualViewport
	const [height, setHeight] = useState<number>(() =>
		visualViewport ? visualViewport.height + visualViewport.offsetTop : window.innerHeight
	)

	useLayoutEffect(() => {
		const handleResize = () => {
			const visualViewport = window.visualViewport
			setHeight(() =>
				visualViewport ? visualViewport.height + visualViewport.offsetTop : window.innerHeight
			)
		}

		window.visualViewport?.addEventListener('resize', handleResize)

		return () => {
			window.visualViewport?.removeEventListener('resize', handleResize)
		}
	}, [])
	return height
}
