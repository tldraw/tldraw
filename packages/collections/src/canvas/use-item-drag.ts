import { MouseEvent, PointerEvent, useMemo } from 'react'
import { getPointerInfo, react, TLContent, useEditor, Vec, VecModel } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionItemId } from '../lib/schema'

type DragState =
	| { name: 'idle' }
	| { name: 'pointing'; itemId: TLCollectionItemId; screenSpaceStart: VecModel; panelRect: DOMRect }
	| { name: 'dragging' }

/**
 * Pointer handlers that let a tile be dragged out of the panel onto the canvas, the way tools are
 * dragged out of the toolbar: past the drag distance and outside the panel, the item's shapes are
 * placed under the pointer and follow it until release. A click without a drag calls `onPlace`.
 */
export function useItemDrag(
	source: CollectionSource,
	onPlace: (itemId: TLCollectionItemId) => void
) {
	const editor = useEditor()

	return useMemo(() => {
		let state: DragState = { name: 'idle' }
		// Items are never replaced, only deleted and re-added, so loaded content stays valid.
		const contents = new Map<TLCollectionItemId, TLContent>()

		const hasLeftPanel = (e: PointerEvent, screenSpaceStart: VecModel, panelRect: DOMRect) => {
			const { left, top, right, bottom } = panelRect
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

				const markId = editor.markHistoryStoppingPoint('drag collection item')
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
			container.classList.add('tlui-collections-dragging')
			const stop = react('collections drag cursor', () => {
				if (editor.isIn('select.translating')) return
				container.classList.remove('tlui-collections-dragging')
				stop()
			})
		}

		return (itemId: TLCollectionItemId) => ({
			onPointerDown(e: PointerEvent<HTMLButtonElement>) {
				if (e.button !== 0) return
				// Outside the canvas's MenuClickCapture, a press that closes a menu still lands here.
				if (editor.menus.hasOpenMenus()) {
					state = { name: 'idle' }
					return
				}
				const panel = e.currentTarget.closest('.tlui-collections-panel') ?? e.currentTarget
				state = {
					name: 'pointing',
					itemId,
					screenSpaceStart: { x: e.clientX, y: e.clientY },
					panelRect: panel.getBoundingClientRect(),
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
				if (!content || !hasLeftPanel(e, state.screenSpaceStart, state.panelRect)) return
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
			onClick(e: MouseEvent<HTMLButtonElement>) {
				const wasPressedHere = state.name === 'pointing' && state.itemId === itemId
				const isKeyboard = e.detail === 0
				state = { name: 'idle' }
				if (wasPressedHere || isKeyboard) onPlace(itemId)
			},
		})
	}, [editor, source, onPlace])
}
