import {
	type ButtonHTMLAttributes,
	type PointerEvent,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import {
	defineMessages,
	getPointerInfo,
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
import { placeLibraryItem } from './place-item'
import { getLibraryErrorReason } from './ui-events'

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
	 * The element the pointer has to leave before a press on a tile becomes a drag. Defaults to the
	 * {@link LibrariesPanel} around the tile, or the tile itself outside one. Return the element
	 * that holds the tiles in a layout of your own, so a drag doesn't start while the pointer is
	 * still over it.
	 */
	getDragRegion?(tile: HTMLElement): Element | null
}

type DragState =
	| { name: 'idle' }
	| { name: 'pointing'; itemId: TLLibraryItemId; screenSpaceStart: VecModel; regionRect: DOMRect }
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
 * A failed click shows a toast.
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
	const msg = useTranslation()
	const { addToast } = useToasts()
	const trackEvent = useUiEvents()
	// Read through a ref so that new options each render don't drop a drag in progress.
	const latest = useRef({ options, msg, addToast, trackEvent })
	useLayoutEffect(() => {
		latest.current = { options, msg, addToast, trackEvent }
	})

	return useMemo(() => {
		const onPlace = (itemId: TLLibraryItemId) => {
			placeLibraryItem(editor, source, itemId).then(
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
		}

		const getDragRegion = (tile: HTMLElement) => {
			const { getDragRegion } = latest.current.options
			const region = getDragRegion ? getDragRegion(tile) : tile.closest('.tlui-libraries-panel')
			return region ?? tile
		}

		let state: DragState = { name: 'idle' }
		// Items are never replaced, only deleted and re-added, so loaded content stays valid.
		const contents = new Map<TLLibraryItemId, TLContent>()

		const hasLeftRegion = (e: PointerEvent, screenSpaceStart: VecModel, regionRect: DOMRect) => {
			const { left, top, right, bottom } = regionRect
			const { clientX: x, clientY: y } = e
			if (x >= left && x <= right && y >= top && y <= bottom) return false
			const minDistanceSq =
				e.pointerType === 'mouse'
					? editor.options.uiDragDistanceSquared
					: editor.options.uiCoarseDragDistanceSquared
			return Vec.Dist2(screenSpaceStart, { x, y }) > minDistanceSq
		}

		const startDrag = (e: PointerEvent, screenSpaceStart: VecModel, content: TLContent) => {
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
				editor.putContentOntoCurrentPage(content, {
					point: editor.inputs.getCurrentPagePoint(),
					select: true,
				})
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

		return (itemId: TLLibraryItemId) => ({
			onPointerDown(e: PointerEvent<HTMLButtonElement>) {
				if (e.button !== 0) return
				state = {
					name: 'pointing',
					itemId,
					screenSpaceStart: { x: e.clientX, y: e.clientY },
					regionRect: getDragRegion(e.currentTarget).getBoundingClientRect(),
				}
				e.currentTarget.setPointerCapture(e.pointerId)
				if (!contents.has(itemId)) {
					source.getItemContent(itemId).then(
						({ content }) => contents.set(itemId, content),
						// A failed load surfaces through onPlace if the press ends as a click.
						() => {}
					)
				}
			},
			onPointerMove(e: PointerEvent<HTMLButtonElement>) {
				if ((e as any).isSpecialRedispatchedEvent) return
				if (state.name !== 'pointing' || state.itemId !== itemId) return
				const content = contents.get(itemId)
				if (!content || !hasLeftRegion(e, state.screenSpaceStart, state.regionRect)) return
				const { screenSpaceStart } = state
				state = { name: 'dragging' }
				startDrag(e, screenSpaceStart, content)
				showMoveCursorWhileTranslating()
			},
			onPointerUp(e: PointerEvent<HTMLButtonElement>) {
				if ((e as any).isSpecialRedispatchedEvent) return
				e.currentTarget.releasePointerCapture(e.pointerId)
				if (state.name !== 'dragging') return
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_up',
					...getPointerInfo(editor, e),
				})
			},
			onPointerCancel() {
				if (state.name === 'dragging') editor.cancel()
				state = { name: 'idle' }
			},
			onClick() {
				const wasDrag = state.name === 'dragging'
				state = { name: 'idle' }
				if (!wasDrag) onPlace(itemId)
			},
		})
	}, [editor, source])
}
