import { ItemTile, type ItemTileProps, type TLLibraryItem } from '@tldraw/libraries'
import { type PointerEvent, useEffect, useRef } from 'react'
import { type Editor, react, useEditor } from 'tldraw'
import { type TLAppUiHandler, useTldrawAppUiEvents } from '../../utils/app-ui-events'

// Long enough for an item's content to load over a slow connection.
const CLICK_PLACEMENT_TIMEOUT_MS = 10_000

const expectedClickPlacements = new WeakMap<Editor, number[]>()

/**
 * Reports the next shapes the user adds as a clicked item's placement. Clicks are queued per
 * editor, so quick clicks on one tile or several each count once. A click whose item never
 * arrives (a failed load, or a read-only editor) expires.
 */
function expectClickPlacement(editor: Editor, trackEvent: TLAppUiHandler) {
	const existing = expectedClickPlacements.get(editor)
	const deadlines = existing ?? []
	deadlines.push(Date.now() + CLICK_PLACEMENT_TIMEOUT_MS)
	if (existing) return
	expectedClickPlacements.set(editor, deadlines)

	const prune = () => {
		while (deadlines.length > 0 && deadlines[0] < Date.now()) deadlines.shift()
		if (deadlines.length > 0) return
		stopListening()
		editor.timers.clearInterval(interval)
		expectedClickPlacements.delete(editor)
	}
	const stopListening = editor.store.listen(
		({ changes }) => {
			if (!Object.values(changes.added).some((record) => record.typeName === 'shape')) return
			while (deadlines.length > 0 && deadlines[0] < Date.now()) deadlines.shift()
			if (deadlines.shift() !== undefined) {
				trackEvent('place-library-item', { source: 'libraries', method: 'click' })
			}
			prune()
		},
		{ source: 'user', scope: 'document' }
	)
	const interval = editor.timers.setInterval(prune, CLICK_PLACEMENT_TIMEOUT_MS)
}

/**
 * The panel's default tile, reporting placements its own handlers make. A drag counts if its
 * shapes survive the drop rather than being removed by a cancel.
 */
export function TlaTrackedItemTile({
	item: _item,
	buttonProps,
	...props
}: ItemTileProps & { item: TLLibraryItem }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()
	const stopWatchingDrop = useRef<() => void>(undefined)
	const dragged = useRef(false)

	useEffect(() => () => stopWatchingDrop.current?.(), [])

	const watchForDrop = () => {
		const placedIds = editor.getSelectedShapeIds()
		const stop = react('library item drop', () => {
			if (editor.isIn('select.translating')) return
			stop()
			if (placedIds.some((id) => editor.getShape(id))) {
				trackEvent('place-library-item', { source: 'libraries', method: 'drag' })
			}
		})
		stopWatchingDrop.current?.()
		stopWatchingDrop.current = stop
	}

	return (
		<ItemTile
			{...props}
			buttonProps={{
				...buttonProps,
				onPointerDown(e: PointerEvent<HTMLButtonElement>) {
					dragged.current = false
					buttonProps?.onPointerDown?.(e)
				},
				onPointerMove(e: PointerEvent<HTMLButtonElement>) {
					const wasTranslating = editor.isIn('select.translating')
					buttonProps?.onPointerMove?.(e)
					if (wasTranslating || !editor.isIn('select.translating')) return
					dragged.current = true
					watchForDrop()
				},
				onClick(e) {
					buttonProps?.onClick?.(e)
					// The click that ends a drag places nothing. Reset here too: Enter and Space click
					// without a pointer down.
					const wasDrag = dragged.current
					dragged.current = false
					if (!wasDrag) expectClickPlacement(editor, trackEvent)
				},
			}}
		/>
	)
}
