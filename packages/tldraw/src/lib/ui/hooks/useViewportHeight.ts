import { useLayoutEffect, useState } from 'react'

/*!
 * BSD License: https://github.com/outline/rich-markdown-editor/blob/main/LICENSE
 * Copyright (c) 2020 General Outline, Inc (https://www.getoutline.com/) and individual contributors.
 *
 * Returns the height of the viewport.
 * This is mainly to account for virtual keyboards on mobile devices.
 *
 * @public
 */
export default function useViewportHeight(): number {
	const [height, setHeight] = useState<number>(
		() => window.visualViewport?.height || window.innerHeight
	)

	useLayoutEffect(() => {
		const handleResize = () => {
			setHeight(() => window.visualViewport?.height || window.innerHeight)
		}

		window.visualViewport?.addEventListener('resize', handleResize)

		return () => {
			window.visualViewport?.removeEventListener('resize', handleResize)
		}
	}, [])
	return height
}
