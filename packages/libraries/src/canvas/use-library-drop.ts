import { useCallback, useEffect } from 'react'
import {
	useEditor,
	useValue,
	type TLEventInfo,
	type TLLibraryId,
	type TLPointerEventInfo,
	type VecLike,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import { getLibraryDropTarget, type LibraryDropSection } from './library-drop-target'
import type { PrepareItemContent } from './save-shapes'
import { collapsedLibraryIds, draggingLibraryItem } from './state'
import { useSaveSelection } from './use-save-selection'

const isRelease = (info: TLEventInfo): info is TLPointerEventInfo =>
	info.type === 'pointer' && info.name === 'pointer_up'

/**
 * Lets shapes dragged on the canvas be dropped on a library's section in `panel` to save a copy
 * of them there. Returns the library the drag is over. Releasing over it puts the shapes back
 * where they were and saves them as "Add to library" does. The canvas holds the pointer for the
 * whole drag, so the panel gets no pointer events and the pointer is checked against the
 * sections' rects instead.
 */
export function useLibraryDrop(
	source: LibrarySource,
	panel: HTMLElement | null,
	prepareItemContent?: PrepareItemContent
) {
	const editor = useEditor()
	const { saveSelection } = useSaveSelection(source, prepareItemContent)

	const getTargetAt = useCallback(
		(point: VecLike) => {
			if (!panel) return undefined
			if (!editor.isIn('select.translating') || draggingLibraryItem.get(editor)) return undefined
			const list = panel.querySelector('.tlui-libraries-sections')
			if (!list) return undefined
			const collapsed = collapsedLibraryIds.get(editor)
			const sections = Array.from(
				list.querySelectorAll<HTMLElement>('.tlui-libraries-section[data-library-id]'),
				(element): LibraryDropSection => {
					const libraryId = element.dataset.libraryId as TLLibraryId
					return {
						libraryId,
						rect: element.getBoundingClientRect(),
						accepts: !collapsed.includes(libraryId) && source.can('addItem', libraryId),
					}
				}
			)
			return getLibraryDropTarget(point, list.getBoundingClientRect(), sections)
		},
		[editor, source, panel]
	)

	const target = useValue(
		'library drop target',
		() => {
			const { x, y } = editor.inputs.getCurrentScreenPoint()
			const screenBounds = editor.getViewportScreenBounds()
			return getTargetAt({ x: x + screenBounds.x, y: y + screenBounds.y })
		},
		[editor, getTargetAt]
	)

	useEffect(() => {
		let dropOn: TLLibraryId | undefined
		const beforeEvent = (info: TLEventInfo) => {
			dropOn = isRelease(info) ? getTargetAt(info.point) : undefined
		}
		const afterEvent = (info: TLEventInfo) => {
			if (!dropOn || !isRelease(info)) return
			const libraryId = dropOn
			dropOn = undefined
			editor.bail()
			saveSelection(libraryId)
		}
		editor.on('before-event', beforeEvent)
		editor.on('event', afterEvent)
		return () => {
			editor.off('before-event', beforeEvent)
			editor.off('event', afterEvent)
		}
	}, [editor, getTargetAt, saveSelection])

	return target
}
