import { RefObject, useCallback, useLayoutEffect, useState } from 'react'
import { Editor, useValue } from 'tldraw'
import { CommandPaletteRow } from './commandPaletteRows'
import { TLUiCommandPalettePosition } from './CommandPaletteShell'

/** @internal */
export interface CommandPaletteAnchor {
	top: number
	bottom: number
	width: number
}

/** @internal */
export function useCommandPaletteLayout({
	editor,
	position,
	rPalette,
	rList,
	isBrowsing,
	rows,
}: {
	editor: Editor | null
	position: TLUiCommandPalettePosition
	rPalette: RefObject<HTMLDivElement | null>
	rList: RefObject<HTMLDivElement | null>
	/** No query, submenu or prompt. */
	isBrowsing: boolean
	rows: readonly CommandPaletteRow[]
}) {
	const [canScrollDown, setCanScrollDown] = useState(false)
	const [anchor, setAnchor] = useState<CommandPaletteAnchor | null>(null)

	const updateScroll = useCallback(() => {
		const list = rList.current
		if (!list) return
		const { scrollHeight, scrollTop, clientHeight } = list
		setCanScrollDown(scrollHeight - scrollTop - clientHeight > 1)
	}, [rList])
	useLayoutEffect(() => {
		const list = rList.current
		if (!list || typeof ResizeObserver === 'undefined') return
		const observer = new ResizeObserver(updateScroll)
		observer.observe(list)
		return () => observer.disconnect()
	}, [rList, updateScroll])
	useLayoutEffect(() => {
		updateScroll()
	}, [rows, updateScroll])

	// Bottom position, like Figma: as wide as the toolbar and 8px above it. Not the toolbar's own gap
	// to the bottom edge, which grows with whatever sits below it, such as a debug panel. Measured
	// while browsing and kept while searching, so the input stays put as results shrink. Only set
	// when it changes: a new object would re-render the registered items, change the rows and
	// measure again, forever. A vertical toolbar is a narrow column, and outside an editor there is
	// no toolbar, so both fall back to the CSS box. Touch devices use the CSS box too, which opens
	// at the top.
	const isCoarsePointer = useValue(
		'coarse pointer',
		() => editor?.getInstanceState().isCoarsePointer ?? false,
		[editor]
	)
	useLayoutEffect(() => {
		if (position !== 'bottom' || !editor || isCoarsePointer) return setAnchor(null)
		if (!isBrowsing) return
		const container = editor.getContainer()
		const palette = rPalette.current
		const toolbar = container.querySelector(
			'.tlui-main-toolbar--horizontal .tlui-main-toolbar__inner'
		)
		if (!palette || !toolbar) return setAnchor(null)
		const bounds = container.getBoundingClientRect()
		const { top, width } = toolbar.getBoundingClientRect()
		const limit = top - bounds.top - 8
		const next = { top: Math.max(8, limit - palette.offsetHeight), bottom: limit, width }
		setAnchor((prev) =>
			prev?.top === next.top && prev.bottom === next.bottom && prev.width === next.width
				? prev
				: next
		)
	}, [editor, position, isCoarsePointer, isBrowsing, rPalette, rows])

	return { anchor, canScrollDown, onListScroll: updateScroll }
}
