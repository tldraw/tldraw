import { Box, useEditor, useValue, useViewportHeight } from '@tldraw/editor'
import { RefObject } from 'react'
import { PORTRAIT_BREAKPOINT } from '../constants'
import { useBreakpoint } from '../context/breakpoints'

const offscreenPosition = {
	x: -1000,
	y: -1000,
	indicatorOffset: 0,
	visible: false,
}

/*!
 * BSD License: https://github.com/outline/rich-markdown-editor/blob/main/LICENSE
 * Copyright (c) 2020 General Outline, Inc (https://www.getoutline.com/) and individual contributors.
 *
 * Modified from FloatingToolbar.tsx -> usePosition
 * https://github.com/outline/rich-markdown-editor/blob/main/src/components/FloatingToolbar.tsx
 *
 * The Outline editor was a Dropbox Paper clone, and I worked on Dropbox Paper as a founding engineer.
 * Now I'm working at tldraw adding rich text features to the editor and bringing those Paper/Outline
 * ideas to the tldraw editor using some Outline logic.
 * It all comes full circle! :)
 *
 * Returns the position of the toolbar based on the current selection in the editor.
 */
/** @public */
export function useContextualToolbarPosition({
	isVisible,
	toolbarRef,
	selectionBounds,
}: {
	isVisible: boolean
	toolbarRef: RefObject<HTMLDivElement>
	selectionBounds?: Box
}) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const selectionToPageBox = useValue(
		'selectionToPageBox',
		() => editor.getSelectionRotatedViewportBounds(),
		[editor]
	)
	const container = editor.getContainer()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM
	const viewportHeight = useViewportHeight()
	selectionBounds = selectionBounds ?? selectionToPageBox

	if (!toolbarRef?.current) return offscreenPosition
	const { width: menuWidth, height: menuHeight } = toolbarRef.current.getBoundingClientRect()

	if (!isVisible || !menuWidth || !menuHeight) {
		return offscreenPosition
	}

	const offscreenPadding = 20
	const isSelectionOffscreen =
		selectionBounds.x < -1 * offscreenPadding ||
		selectionBounds.y < -1 * offscreenPadding ||
		selectionBounds.x > window.innerWidth + offscreenPadding ||
		selectionBounds.y > window.innerHeight + offscreenPadding

	if (isMobile || isNaN(selectionBounds.x) || isNaN(selectionBounds.y) || isSelectionOffscreen) {
		return {
			x: container.clientWidth / 2 - menuWidth / 2,
			y: viewportHeight - menuHeight - 16,
			indicatorOffset: 0,
			visible: true,
		}
	}

	// Calcluate the horizontal center of the selection.
	const halfSelection = selectionBounds.w / 2
	const centerOfSelection = selectionBounds.x + halfSelection

	// Position the menu so that it is centered over the selection except in
	// the cases where it would extend off the edge of the screen. In these
	// instances leave a margin.
	const margin = 16
	const left = Math.min(
		container.clientWidth - menuWidth - margin,
		Math.max(margin, centerOfSelection - menuWidth / 2)
	)
	const top = Math.min(
		container.clientHeight - menuHeight - margin,
		Math.max(margin, selectionBounds.y - menuHeight)
	)

	// If the menu has been offset to not extend offscreen then we should adjust
	// the position of the triangle underneath to correctly point to the center
	// of the selection still.
	const toolbarIndicatorPadding = 20
	const indicatorOffset = Math.max(
		(-1 * menuWidth) / 2 + toolbarIndicatorPadding,
		Math.min(menuWidth / 2 - toolbarIndicatorPadding, left - (centerOfSelection - menuWidth / 2))
	)

	return {
		x: Math.round(left + container.scrollLeft),
		y: Math.round(top + container.scrollTop),
		indicatorOffset: Math.round(indicatorOffset),
		visible: true,
	}
}
