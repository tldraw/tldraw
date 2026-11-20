import {
	type ButtonHTMLAttributes,
	type PointerEvent,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import {
	defineMessages,
	getPointerInfo,
	hideAllTooltips,
	react,
	TLLibraryItemId,
	TLContent,
	useEditor,
	useToasts,
	useTranslation,
	useUiEvents,
	Vec,
	VecModel,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { getContentTooNewToast } from './content-too-new-toast'
import {
	defaultPlaceLibraryItem,
	findListedItem,
	type LibraryItemPlacer,
	placeItemWith,
} from './place-item'
import { getLibraryErrorReason } from './ui-events'
import { useIsPhone } from './use-is-phone'

const messages = defineMessages({
	placeErrorTitle: { id: 'libraries.place-error.title', defaultMessage: "Couldn't place item" },
	placeErrorDescription: {
		id: 'libraries.place-error.description',
		defaultMessage: 'It may have been deleted. Try again, or pick another item.',
	},
})

/** @public */
export interface LibraryItemDragOptions {
	/**
	 * Places the item, on a click or once a drag starts. Defaults to
	 * {@link defaultPlaceLibraryItem}.
	 */
	placeItem?: LibraryItemPlacer
	/**
	 * The element the pointer has to leave before a press on a tile becomes a drag. Defaults to the
	 * {@link LibrariesPanel} around the tile, or the tile itself outside one. Return the element
	 * that holds the tiles in a layout of your own, so a drag doesn't start while the pointer is
	 * still over it.
	 */
	getDragRegion?(tile: HTMLElement): Element | null
}

type DragState =
	| { name: 'idle' }
	| {
			name: 'pointing'
			itemId: TLLibraryItemId
			screenSpaceStart: VecModel
			region: Element
			regionRect: DOMRect
			lastMove?: PointerEvent
	  }
	| { name: 'dragging' }

/**
 * Props for an item's tile, the button that shows it, so that clicking it places the item in the
 * middle of the viewport and dragging it out drops the item under the pointer: the props the
 * {@link LibrariesPanel} gives its tiles.
 *
 * A drag starts once the pointer has left the drag region (see
 * {@link LibraryItemDragOptions.getDragRegion}) and moved past the editor's `uiDragDistanceSquared`
 * option (`uiCoarseDragDistanceSquared` for touch and pen), as dragging a tool out of the toolbar
 * does. The item's shapes are then placed under the pointer, selected, and follow it until release.
 * A failed click shows a toast. On touch, the browser cancels a drag in any direction a tile's
 * `touch-action` lets it pan, so give tiles one that leaves the drag-out direction to them: the
 * panel's tiles have `pan-y`, scrolling its list vertically and dragging out sideways. On a phone,
 * below the breakpoint where tldraw's toolbar takes its mobile layout, nothing is dragged out: a
 * press only places the item when it ends as a click.
 *
 * @example
 * ```tsx
 * const getItemProps = useLibraryItemDrag(source)
 * return items.map((item) => <button key={item.id} {...getItemProps(item.id)}>{item.name}</button>)
 * ```
 * @public
 */
export function useLibraryItemDrag(
	source: LibrarySource,
	options: LibraryItemDragOptions = {}
): (itemId: TLLibraryItemId) => ButtonHTMLAttributes<HTMLButtonElement> {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const onPlace = usePlaceLibraryItem(source, options.placeItem)
	const isPhone = useIsPhone()
	// Read through a ref so that new options each render don't drop a drag in progress.
	const latest = useRef({ options, trackEvent, isPhone })
	useLayoutEffect(() => {
		latest.current = { options, trackEvent, isPhone }
	})

	return useMemo(() => {
		const getDragRegion = (tile: HTMLElement) => {
			const { getDragRegion } = latest.current.options
			const region = getDragRegion ? getDragRegion(tile) : tile.closest('.tlui-libraries-panel')
			return region ?? tile
		}

		let state: DragState = { name: 'idle' }
		// Items are never replaced, only deleted and re-added, so loaded content stays valid.
		const contents = new Map<TLLibraryItemId, TLContent>()

		const isPastDragDistance = (e: PointerEvent, screenSpaceStart: VecModel) => {
			const minDistanceSq =
				e.pointerType === 'mouse'
					? editor.options.uiDragDistanceSquared
					: editor.options.uiCoarseDragDistanceSquared
			return Vec.Dist2(screenSpaceStart, { x: e.clientX, y: e.clientY }) > minDistanceSq
		}

		const hasLeftRegion = (e: PointerEvent, screenSpaceStart: VecModel, regionRect: DOMRect) => {
			const { left, top, right, bottom } = regionRect
			const { clientX: x, clientY: y } = e
			if (x >= left && x <= right && y >= top && y <= bottom) return false
			return isPastDragDistance(e, screenSpaceStart)
		}

		const stopPointing = () => {
			if (state.name === 'pointing') state.region.classList.remove('tlui-libraries-dragging')
		}

		const startDrag = (
			e: PointerEvent,
			screenSpaceStart: VecModel,
			itemId: TLLibraryItemId,
			content: TLContent
		) => {
			const item = findListedItem(source, itemId)
			if (!item) return
			editor.run(() => {
				editor.setCurrentTool('select')
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_down',
					...getPointerInfo(editor, e),
					point: screenSpaceStart,
				})
				editor.selectNone()

				const markId = editor.markHistoryStoppingPoint('drag library item')
				const { placeItem = defaultPlaceLibraryItem } = latest.current.options
				const ids = placeItem(editor, {
					item,
					content,
					point: editor.inputs.getCurrentPagePoint(),
					select: true,
					via: 'drag',
				})
				editor.setSelectedShapes(ids)
				const shape = editor.getSelectedShapes()[0]
				if (!shape) {
					editor.setCurrentTool('select.idle')
					return
				}

				editor.setCurrentTool('select.translating', {
					type: 'pointer',
					target: 'shape',
					name: 'pointer_move',
					...getPointerInfo(editor, e),
					point: screenSpaceStart,
					shape,
					isCreating: true,
					creatingMarkId: markId,
					onCreate() {
						editor.setCurrentTool('select.idle')
						latest.current.trackEvent('place-library-item', { source: 'libraries', method: 'drag' })
					},
				})

				// The shapes were placed at the press point, under the panel. Move them to the pointer
				// now rather than on the next pointer move.
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_move',
					...getPointerInfo(editor, e),
				})
				hideAllTooltips()
				editor.getContainer().focus()
			})
		}

		// Translating sets the canvas's cursor, but the panel's elements set their own, including the
		// tile, which holds pointer capture for the whole drag.
		const showMoveCursorWhileTranslating = () => {
			if (!editor.isIn('select.translating')) return
			const container = editor.getContainer()
			container.classList.add('tlui-libraries-dragging')
			const stop = react('libraries drag cursor', () => {
				if (editor.isIn('select.translating')) return
				container.classList.remove('tlui-libraries-dragging')
				stop()
			})
		}

		const tryStartDrag = (itemId: TLLibraryItemId) => {
			if (state.name !== 'pointing' || state.itemId !== itemId || !state.lastMove) return
			const content = contents.get(itemId)
			const { lastMove, screenSpaceStart, regionRect } = state
			if (!content || !hasLeftRegion(lastMove, screenSpaceStart, regionRect)) return
			stopPointing()
			state = { name: 'dragging' }
			startDrag(lastMove, screenSpaceStart, itemId, content)
			showMoveCursorWhileTranslating()
		}

		const load = (itemId: TLLibraryItemId) => {
			if (contents.has(itemId)) return
			source.getItemContent(itemId).then(
				({ content }) => {
					contents.set(itemId, content)
					tryStartDrag(itemId)
				},
				// A failed load surfaces through onPlace if the press ends as a click.
				() => {}
			)
		}

		return (itemId: TLLibraryItemId) => ({
			onPointerEnter() {
				load(itemId)
			},
			onPointerDown(e: PointerEvent<HTMLButtonElement>) {
				if (e.button !== 0) return
				const region = getDragRegion(e.currentTarget)
				state = {
					name: 'pointing',
					itemId,
					screenSpaceStart: { x: e.clientX, y: e.clientY },
					region,
					regionRect: region.getBoundingClientRect(),
				}
				e.currentTarget.setPointerCapture(e.pointerId)
				load(itemId)
			},
			onPointerMove(e: PointerEvent<HTMLButtonElement>) {
				if ((e as any).isSpecialRedispatchedEvent) return
				if (state.name !== 'pointing' || state.itemId !== itemId) return
				if (latest.current.isPhone) return
				if (isPastDragDistance(e, state.screenSpaceStart)) {
					state.region.classList.add('tlui-libraries-dragging')
				}
				state.lastMove = e
				tryStartDrag(itemId)
			},
			onPointerUp(e: PointerEvent<HTMLButtonElement>) {
				if ((e as any).isSpecialRedispatchedEvent) return
				e.currentTarget.releasePointerCapture(e.pointerId)
				stopPointing()
				if (state.name !== 'dragging') return
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(editor, e),
				})
			},
			onPointerCancel() {
				stopPointing()
				if (state.name === 'dragging') editor.cancel()
				state = { name: 'idle' }
			},
			onClick() {
				const wasDrag = state.name === 'dragging'
				state = { name: 'idle' }
				if (!wasDrag) onPlace(itemId)
			},
		})
	}, [editor, source, onPlace])
}

/**
 * Places an item as a click on its tile does, in the middle of the viewport with `placeItem`.
 * Reports `place-library-item`, or shows a toast and reports `library-error` if it fails.
 */
export function usePlaceLibraryItem(
	source: LibrarySource,
	placeItem: LibraryItemPlacer = defaultPlaceLibraryItem
): (itemId: TLLibraryItemId) => void {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const trackEvent = useUiEvents()
	const latest = useRef({ placeItem, msg, addToast, trackEvent })
	useLayoutEffect(() => {
		latest.current = { placeItem, msg, addToast, trackEvent }
	})

	return useCallback(
		(itemId: TLLibraryItemId) => {
			placeItemWith(editor, source, itemId, {}, latest.current.placeItem, 'click').then(
				() =>
					latest.current.trackEvent('place-library-item', { source: 'libraries', method: 'click' }),
				(error) => {
					const { msg, addToast, trackEvent } = latest.current
					trackEvent('library-error', {
						source: 'libraries',
						action: 'place-library-item',
						reason: getLibraryErrorReason(error),
					})
					addToast(
						getContentTooNewToast(error, msg) ?? {
							title: msg(messages.placeErrorTitle),
							description: msg(messages.placeErrorDescription),
							severity: 'error',
						}
					)
				}
			)
		},
		[editor, source]
	)
}
