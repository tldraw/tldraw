import { useLayoutEffect, useState } from 'react'
import { useMaybeEditor } from './useEditor'

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
/**
 * The height of the visible viewport, including the visual viewport's own offset — so it tracks a
 * mobile software keyboard, which shrinks the visual viewport while leaving the layout viewport
 * (and CSS `dvh`) alone.
 *
 * @deprecated Read `window.visualViewport` directly instead. This returns a single scalar — the
 * visible viewport's bottom edge — where keeping UI clear of the software keyboard generally needs
 * the whole visible rectangle: the left and right edges to keep a panel on screen horizontally, and
 * `offsetTop` on its own to find the visible top. It has had no callers since the contextual
 * toolbar it was written for was cut before v3.14 shipped. This will be removed in a future
 * release.
 *
 * @public
 */
export function useViewportHeight(): number {
	const editor = useMaybeEditor()
	const win = editor?.getContainerWindow() ?? window
	const vv = win.visualViewport
	const [height, setHeight] = useState<number>(() =>
		vv ? vv.height + vv.offsetTop : win.innerHeight
	)

	useLayoutEffect(() => {
		const win = editor?.getContainerWindow() ?? window
		const handleResize = () => {
			const vv = win.visualViewport
			setHeight(() => (vv ? vv.height + vv.offsetTop : win.innerHeight))
		}

		win.visualViewport?.addEventListener('resize', handleResize)
		win.visualViewport?.addEventListener('scroll', handleResize)

		return () => {
			win.visualViewport?.removeEventListener('resize', handleResize)
			win.visualViewport?.removeEventListener('scroll', handleResize)
		}
	}, [editor])
	return height
}
