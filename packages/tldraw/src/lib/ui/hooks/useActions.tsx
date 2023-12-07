import {
	ANIMATION_MEDIUM_MS,
	Box2d,
	Editor,
	TAU,
	TLBookmarkShape,
	TLEmbedShape,
	TLFrameShape,
	TLGroupShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	Vec2d,
	approximately,
	compact,
	createShapeId,
	openWindow,
	useEditor,
} from '@tldraw/editor'
import * as React from 'react'
import { getEmbedInfo } from '../../utils/embeds/embeds'
import { fitFrameToContent, removeFrame } from '../../utils/frames/frames'
import { EditLinkDialog } from '../components/EditLinkDialog'
import { EmbedDialog } from '../components/EmbedDialog'
import { TLUiIconType } from '../icon-types'
import { useMenuClipboardEvents } from './useClipboardEvents'
import { useCopyAs } from './useCopyAs'
import { useDialogs } from './useDialogsProvider'
import { TLUiEventSource, useUiEvents } from './useEventsProvider'
import { useExportAs } from './useExportAs'
import { useInsertMedia } from './useInsertMedia'
import { usePrint } from './usePrint'
import { useToasts } from './useToastsProvider'
import { TLUiTranslationKey } from './useTranslation/TLUiTranslationKey'

/** @public */
export interface TLUiActionItem<
	TransationKey extends string = string,
	IconType extends string = string
> {
	icon?: IconType
	id: string
	kbd?: string
	title?: string
	label?: TransationKey
	menuLabel?: TransationKey
	shortcutsLabel?: TransationKey
	contextMenuLabel?: TransationKey
	readonlyOk: boolean
	checkbox?: boolean
	onSelect: (source: TLUiEventSource) => Promise<void> | void
}

/** @public */
export type TLUiActionsContextType = Record<string, TLUiActionItem>

/** @internal */
export const ActionsContext = React.createContext<TLUiActionsContextType>({})

/** @public */
export type ActionsProviderProps = {
	overrides?: (
		editor: Editor,
		actions: TLUiActionsContextType,
		helpers: undefined
	) => TLUiActionsContextType
	children: any
}

function makeActions(actions: TLUiActionItem[]) {
	return Object.fromEntries(actions.map((action) => [action.id, action])) as TLUiActionsContextType
}

/** @internal */
export function ActionsProvider({ overrides, children }: ActionsProviderProps) {
	const editor = useEditor()

	const { addDialog, clearDialogs } = useDialogs()
	const { clearToasts } = useToasts()

	const insertMedia = useInsertMedia()
	const printSelectionOrPages = usePrint()
	const { cut, copy, paste } = useMenuClipboardEvents()
	const copyAs = useCopyAs()
	const exportAs = useExportAs()

	const trackEvent = useUiEvents()

	// should this be a useMemo? looks like it doesn't actually deref any reactive values
	const actions = React.useMemo<TLUiActionsContextType>(() => {
		function mustGoBackToSelectToolFirst() {
			if (!editor.isIn('select')) {
				editor.complete()
				editor.setCurrentTool('select')
				return false // false will still let the action happen, true will stop it
				// todo: remove this return value once we're suuuuure
			}

			return false
		}

		function hasSelectedShapes() {
			return editor.getSelectedShapeIds().length > 0
		}

		const actionItems: TLUiActionItem<TLUiTranslationKey, TLUiIconType>[] = [
			{
				id: 'edit-link',
				label: 'action.edit-link',
				icon: 'link',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('edit-link', { source })
					editor.mark('edit-link')
					addDialog({ component: EditLinkDialog })
				},
			},
			{
				id: 'insert-embed',
				label: 'action.insert-embed',
				readonlyOk: false,
				kbd: '$i',
				onSelect(source) {
					trackEvent('insert-embed', { source })
					addDialog({ component: EmbedDialog })
				},
			},
			{
				id: 'insert-media',
				label: 'action.insert-media',
				kbd: '$u',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('insert-media', { source })
					insertMedia()
				},
			},
			{
				id: 'undo',
				label: 'action.undo',
				icon: 'undo',
				kbd: '$z',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('undo', { source })
					editor.undo()
				},
			},
			{
				id: 'redo',
				label: 'action.redo',
				icon: 'redo',
				kbd: '$!z',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('redo', { source })
					editor.redo()
				},
			},
			{
				id: 'export-as-svg',
				label: 'action.export-as-svg',
				menuLabel: 'action.export-as-svg.short',
				contextMenuLabel: 'action.export-as-svg.short',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('export-as', { format: 'svg', source })
					exportAs(editor.getSelectedShapeIds(), 'svg')
				},
			},
			{
				id: 'export-as-png',
				label: 'action.export-as-png',
				menuLabel: 'action.export-as-png.short',
				contextMenuLabel: 'action.export-as-png.short',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('export-as', { format: 'png', source })
					exportAs(editor.getSelectedShapeIds(), 'png')
				},
			},
			{
				id: 'export-as-json',
				label: 'action.export-as-json',
				menuLabel: 'action.export-as-json.short',
				contextMenuLabel: 'action.export-as-json.short',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('export-as', { format: 'json', source })
					exportAs(editor.getSelectedShapeIds(), 'json')
				},
			},
			{
				id: 'copy-as-svg',
				label: 'action.copy-as-svg',
				menuLabel: 'action.copy-as-svg.short',
				contextMenuLabel: 'action.copy-as-svg.short',
				kbd: '$!c',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('copy-as', { format: 'svg', source })
					copyAs(editor.getSelectedShapeIds(), 'svg')
				},
			},
			{
				id: 'copy-as-png',
				label: 'action.copy-as-png',
				menuLabel: 'action.copy-as-png.short',
				contextMenuLabel: 'action.copy-as-png.short',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('copy-as', { format: 'png', source })
					copyAs(editor.getSelectedShapeIds(), 'png')
				},
			},
			{
				id: 'copy-as-json',
				label: 'action.copy-as-json',
				menuLabel: 'action.copy-as-json.short',
				contextMenuLabel: 'action.copy-as-json.short',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('copy-as', { format: 'json', source })
					copyAs(editor.getSelectedShapeIds(), 'json')
				},
			},
			{
				id: 'toggle-auto-size',
				label: 'action.toggle-auto-size',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('toggle-auto-size', { source })
					editor.mark('toggling auto size')
					editor.updateShapes(
						editor
							.getSelectedShapes()
							.filter(
								(shape): shape is TLTextShape =>
									editor.isShapeOfType<TLTextShape>(shape, 'text') && shape.props.autoSize === false
							)
							.map((shape) => {
								return {
									id: shape.id,
									type: shape.type,
									props: {
										...shape.props,
										w: 8,
										autoSize: true,
									},
								}
							})
					)
				},
			},
			{
				id: 'open-embed-link',
				label: 'action.open-embed-link',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('open-embed-link', { source })
					const ids = editor.getSelectedShapeIds()
					const warnMsg = 'No embed shapes selected'
					if (ids.length !== 1) {
						console.error(warnMsg)
						return
					}
					const shape = editor.getShape(ids[0])
					if (!shape || !editor.isShapeOfType<TLEmbedShape>(shape, 'embed')) {
						console.error(warnMsg)
						return
					}

					openWindow(shape.props.url, '_blank')
				},
			},
			{
				id: 'select-zoom-tool',
				readonlyOk: true,
				kbd: 'z',
				onSelect(source) {
					if (editor.root.getCurrent()?.id === 'zoom') return

					trackEvent('zoom-tool', { source })
					if (!(editor.inputs.shiftKey || editor.inputs.ctrlKey)) {
						const currentTool = editor.root.getCurrent()
						if (currentTool && currentTool.getCurrent()?.id === 'idle') {
							editor.setCurrentTool('zoom', { onInteractionEnd: currentTool.id, maskAs: 'zoom' })
						}
					}
				},
			},
			{
				id: 'convert-to-bookmark',
				label: 'action.convert-to-bookmark',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					editor.batch(() => {
						trackEvent('convert-to-bookmark', { source })
						const shapes = editor.getSelectedShapes()

						const createList: TLShapePartial[] = []
						const deleteList: TLShapeId[] = []
						for (const shape of shapes) {
							if (!shape || !editor.isShapeOfType<TLEmbedShape>(shape, 'embed') || !shape.props.url)
								continue

							const newPos = new Vec2d(shape.x, shape.y)
							newPos.rot(-shape.rotation)
							newPos.add(new Vec2d(shape.props.w / 2 - 300 / 2, shape.props.h / 2 - 320 / 2)) // see bookmark shape util
							newPos.rot(shape.rotation)
							const partial: TLShapePartial<TLBookmarkShape> = {
								id: createShapeId(),
								type: 'bookmark',
								rotation: shape.rotation,
								x: newPos.x,
								y: newPos.y,
								opacity: 1,
								props: {
									url: shape.props.url,
								},
							}

							createList.push(partial)
							deleteList.push(shape.id)
						}

						editor.mark('convert shapes to bookmark')
						editor.deleteShapes(deleteList)
						editor.createShapes(createList)
					})
				},
			},
			{
				id: 'convert-to-embed',
				label: 'action.convert-to-embed',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('convert-to-embed', { source })

					editor.batch(() => {
						const ids = editor.getSelectedShapeIds()
						const shapes = compact(ids.map((id) => editor.getShape(id)))

						const createList: TLShapePartial[] = []
						const deleteList: TLShapeId[] = []
						for (const shape of shapes) {
							if (!editor.isShapeOfType<TLBookmarkShape>(shape, 'bookmark')) continue

							const { url } = shape.props

							const embedInfo = getEmbedInfo(shape.props.url)

							if (!embedInfo) continue
							if (!embedInfo.definition) continue

							const { width, height } = embedInfo.definition

							const newPos = new Vec2d(shape.x, shape.y)
							newPos.rot(-shape.rotation)
							newPos.add(new Vec2d(shape.props.w / 2 - width / 2, shape.props.h / 2 - height / 2))
							newPos.rot(shape.rotation)

							const shapeToCreate: TLShapePartial<TLEmbedShape> = {
								id: createShapeId(),
								type: 'embed',
								x: newPos.x,
								y: newPos.y,
								rotation: shape.rotation,
								props: {
									url: url,
									w: width,
									h: height,
								},
							}

							createList.push(shapeToCreate)
							deleteList.push(shape.id)
						}

						editor.mark('convert shapes to embed')
						editor.deleteShapes(deleteList)
						editor.createShapes(createList)
					})
				},
			},
			{
				id: 'duplicate',
				kbd: '$d',
				label: 'action.duplicate',
				icon: 'duplicate',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('duplicate-shapes', { source })
					const ids = editor.getSelectedShapeIds()
					const commonBounds = Box2d.Common(compact(ids.map((id) => editor.getShapePageBounds(id))))
					const offset = editor.getInstanceState().canMoveCamera
						? {
								x: commonBounds.width + 10,
								y: 0,
						  }
						: {
								x: 16 / editor.getZoomLevel(),
								y: 16 / editor.getZoomLevel(),
						  }
					editor.mark('duplicate shapes')
					editor.duplicateShapes(ids, offset)
				},
			},
			{
				id: 'ungroup',
				label: 'action.ungroup',
				kbd: '$!g',
				icon: 'ungroup',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('ungroup-shapes', { source })
					editor.mark('ungroup')
					editor.ungroupShapes(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'group',
				label: 'action.group',
				kbd: '$g',
				icon: 'group',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('group-shapes', { source })
					const onlySelectedShape = editor.getOnlySelectedShape()
					if (onlySelectedShape && editor.isShapeOfType<TLGroupShape>(onlySelectedShape, 'group')) {
						editor.mark('ungroup')
						editor.ungroupShapes(editor.getSelectedShapeIds())
					} else {
						editor.mark('group')
						editor.groupShapes(editor.getSelectedShapeIds())
					}
				},
			},
			{
				id: 'remove-frame',
				label: 'action.remove-frame',
				kbd: '$!f',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return

					trackEvent('remove-frame', { source })
					const selectedShapes = editor.getSelectedShapes()
					if (
						selectedShapes.length > 0 &&
						selectedShapes.every((shape) => editor.isShapeOfType<TLFrameShape>(shape, 'frame'))
					) {
						editor.mark('remove-frame')
						removeFrame(
							editor,
							selectedShapes.map((shape) => shape.id)
						)
					}
				},
			},
			{
				id: 'fit-frame-to-content',
				label: 'action.fit-frame-to-content',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return

					trackEvent('fit-frame-to-content', { source })
					const onlySelectedShape = editor.getOnlySelectedShape()
					if (onlySelectedShape && editor.isShapeOfType<TLFrameShape>(onlySelectedShape, 'frame')) {
						editor.mark('fit-frame-to-content')
						fitFrameToContent(editor, onlySelectedShape.id)
					}
				},
			},
			{
				id: 'align-left',
				label: 'action.align-left',
				kbd: '?A',
				icon: 'align-left',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'left', source })
					editor.mark('align left')
					editor.alignShapes(editor.getSelectedShapeIds(), 'left')
				},
			},
			{
				id: 'align-center-horizontal',
				label: 'action.align-center-horizontal',
				contextMenuLabel: 'action.align-center-horizontal.short',
				kbd: '?H',
				icon: 'align-center-horizontal',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'center-horizontal', source })
					editor.mark('align center horizontal')
					editor.alignShapes(editor.getSelectedShapeIds(), 'center-horizontal')
				},
			},
			{
				id: 'align-right',
				label: 'action.align-right',
				kbd: '?D',
				icon: 'align-right',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'right', source })
					editor.mark('align right')
					editor.alignShapes(editor.getSelectedShapeIds(), 'right')
				},
			},
			{
				id: 'align-center-vertical',
				label: 'action.align-center-vertical',
				contextMenuLabel: 'action.align-center-vertical.short',
				kbd: '?V',
				icon: 'align-center-vertical',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'center-vertical', source })
					editor.mark('align center vertical')
					editor.alignShapes(editor.getSelectedShapeIds(), 'center-vertical')
				},
			},
			{
				id: 'align-top',
				label: 'action.align-top',
				icon: 'align-top',
				kbd: '?W',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'top', source })
					editor.mark('align top')
					editor.alignShapes(editor.getSelectedShapeIds(), 'top')
				},
			},
			{
				id: 'align-bottom',
				label: 'action.align-bottom',
				icon: 'align-bottom',
				kbd: '?S',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'bottom', source })
					editor.mark('align bottom')
					editor.alignShapes(editor.getSelectedShapeIds(), 'bottom')
				},
			},
			{
				id: 'distribute-horizontal',
				label: 'action.distribute-horizontal',
				contextMenuLabel: 'action.distribute-horizontal.short',
				icon: 'distribute-horizontal',
				kbd: '?!h',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('distribute-shapes', { operation: 'horizontal', source })
					editor.mark('distribute horizontal')
					editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
				},
			},
			{
				id: 'distribute-vertical',
				label: 'action.distribute-vertical',
				contextMenuLabel: 'action.distribute-vertical.short',
				icon: 'distribute-vertical',
				kbd: '?!V',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('distribute-shapes', { operation: 'vertical', source })
					editor.mark('distribute vertical')
					editor.distributeShapes(editor.getSelectedShapeIds(), 'vertical')
				},
			},
			{
				id: 'stretch-horizontal',
				label: 'action.stretch-horizontal',
				contextMenuLabel: 'action.stretch-horizontal.short',
				icon: 'stretch-horizontal',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stretch-shapes', { operation: 'horizontal', source })
					editor.mark('stretch horizontal')
					editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
				},
			},
			{
				id: 'stretch-vertical',
				label: 'action.stretch-vertical',
				contextMenuLabel: 'action.stretch-vertical.short',
				icon: 'stretch-vertical',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stretch-shapes', { operation: 'vertical', source })
					editor.mark('stretch vertical')
					editor.stretchShapes(editor.getSelectedShapeIds(), 'vertical')
				},
			},
			{
				id: 'flip-horizontal',
				label: 'action.flip-horizontal',
				contextMenuLabel: 'action.flip-horizontal.short',
				kbd: '!h',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('flip-shapes', { operation: 'horizontal', source })
					editor.mark('flip horizontal')
					editor.flipShapes(editor.getSelectedShapeIds(), 'horizontal')
				},
			},
			{
				id: 'flip-vertical',
				label: 'action.flip-vertical',
				contextMenuLabel: 'action.flip-vertical.short',
				kbd: '!v',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('flip-shapes', { operation: 'vertical', source })
					editor.mark('flip vertical')
					editor.flipShapes(editor.getSelectedShapeIds(), 'vertical')
				},
			},
			{
				id: 'pack',
				label: 'action.pack',
				icon: 'pack',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('pack-shapes', { source })
					editor.mark('pack')
					editor.packShapes(editor.getSelectedShapeIds(), 16)
				},
			},
			{
				id: 'stack-vertical',
				label: 'action.stack-vertical',
				contextMenuLabel: 'action.stack-vertical.short',
				icon: 'stack-vertical',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stack-shapes', { operation: 'vertical', source })
					editor.mark('stack-vertical')
					editor.stackShapes(editor.getSelectedShapeIds(), 'vertical', 16)
				},
			},
			{
				id: 'stack-horizontal',
				label: 'action.stack-horizontal',
				contextMenuLabel: 'action.stack-horizontal.short',
				icon: 'stack-horizontal',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stack-shapes', { operation: 'horizontal', source })
					editor.mark('stack-horizontal')
					editor.stackShapes(editor.getSelectedShapeIds(), 'horizontal', 16)
				},
			},
			{
				id: 'bring-to-front',
				label: 'action.bring-to-front',
				kbd: ']',
				icon: 'bring-to-front',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'toFront', source })
					editor.mark('bring to front')
					editor.bringToFront(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'bring-forward',
				label: 'action.bring-forward',
				icon: 'bring-forward',
				kbd: '?]',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'forward', source })
					editor.mark('bring forward')
					editor.bringForward(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'send-backward',
				label: 'action.send-backward',
				icon: 'send-backward',
				kbd: '?[',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'backward', source })
					editor.mark('send backward')
					editor.sendBackward(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'send-to-back',
				label: 'action.send-to-back',
				icon: 'send-to-back',
				kbd: '[',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'toBack', source })
					editor.mark('send to back')
					editor.sendToBack(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'cut',
				label: 'action.cut',
				kbd: '$x',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					editor.mark('cut')
					cut(source)
				},
			},
			{
				id: 'copy',
				label: 'action.copy',
				kbd: '$c',
				readonlyOk: true,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					copy(source)
				},
			},
			{
				id: 'paste',
				label: 'action.paste',
				kbd: '$v',
				readonlyOk: false,
				onSelect(source) {
					navigator.clipboard?.read().then((clipboardItems) => {
						paste(
							clipboardItems,
							source,
							source === 'context-menu' ? editor.inputs.currentPagePoint : undefined
						)
					})
				},
			},
			{
				id: 'select-all',
				label: 'action.select-all',
				kbd: '$a',
				readonlyOk: true,
				onSelect(source) {
					editor.batch(() => {
						if (mustGoBackToSelectToolFirst()) return

						trackEvent('select-all-shapes', { source })

						editor.mark('select all kbd')
						editor.selectAll()
					})
				},
			},
			{
				id: 'select-none',
				label: 'action.select-none',
				readonlyOk: true,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('select-none-shapes', { source })
					editor.mark('select none')
					editor.selectNone()
				},
			},
			{
				id: 'delete',
				label: 'action.delete',
				kbd: '⌫,del,backspace',
				icon: 'trash',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('delete-shapes', { source })
					editor.mark('delete')
					editor.deleteShapes(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'rotate-cw',
				label: 'action.rotate-cw',
				icon: 'rotate-cw',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('rotate-cw', { source })
					editor.mark('rotate-cw')
					const offset = editor.getSelectionRotation() % (TAU / 2)
					const dontUseOffset = approximately(offset, 0) || approximately(offset, TAU / 2)
					editor.rotateShapesBy(
						editor.getSelectedShapeIds(),
						TAU / 2 - (dontUseOffset ? 0 : offset)
					)
				},
			},
			{
				id: 'rotate-ccw',
				label: 'action.rotate-ccw',
				icon: 'rotate-ccw',
				readonlyOk: false,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('rotate-ccw', { source })
					editor.mark('rotate-ccw')
					const offset = editor.getSelectionRotation() % (TAU / 2)
					const offsetCloseToZero = approximately(offset, 0)
					editor.rotateShapesBy(
						editor.getSelectedShapeIds(),
						offsetCloseToZero ? -(TAU / 2) : -offset
					)
				},
			},
			{
				id: 'zoom-in',
				label: 'action.zoom-in',
				kbd: '$=,=',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-in', { source })
					editor.zoomIn(editor.getViewportScreenCenter(), { duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'zoom-out',
				label: 'action.zoom-out',
				kbd: '$-,-',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-out', { source })
					editor.zoomOut(editor.getViewportScreenCenter(), { duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'zoom-to-100',
				label: 'action.zoom-to-100',
				icon: 'reset-zoom',
				kbd: '!0',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('reset-zoom', { source })
					editor.resetZoom(editor.getViewportScreenCenter(), { duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'zoom-to-fit',
				label: 'action.zoom-to-fit',
				kbd: '!1',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-to-fit', { source })
					editor.zoomToFit({ duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'zoom-to-selection',
				label: 'action.zoom-to-selection',
				kbd: '!2',
				readonlyOk: true,
				onSelect(source) {
					if (!hasSelectedShapes()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('zoom-to-selection', { source })
					editor.zoomToSelection({ duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'toggle-snap-mode',
				label: 'action.toggle-snap-mode',
				menuLabel: 'action.toggle-snap-mode.menu',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('toggle-snap-mode', { source })
					editor.user.updateUserPreferences({ isSnapMode: !editor.user.getIsSnapMode() })
				},
				checkbox: true,
			},
			{
				id: 'toggle-dark-mode',
				label: 'action.toggle-dark-mode',
				menuLabel: 'action.toggle-dark-mode.menu',
				kbd: '$/',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-dark-mode', { source })
					editor.user.updateUserPreferences({ isDarkMode: !editor.user.getIsDarkMode() })
				},
				checkbox: true,
			},
			{
				id: 'toggle-reduce-motion',
				label: 'action.toggle-reduce-motion',
				menuLabel: 'action.toggle-reduce-motion.menu',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-reduce-motion', { source })
					editor.user.updateUserPreferences({
						animationSpeed: editor.user.getAnimationSpeed() === 0 ? 1 : 0,
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-transparent',
				label: 'action.toggle-transparent',
				menuLabel: 'action.toggle-transparent.menu',
				contextMenuLabel: 'action.toggle-transparent.context-menu',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-transparent', { source })
					editor.updateInstanceState(
						{
							exportBackground: !editor.getInstanceState().exportBackground,
						},
						{ ephemeral: true }
					)
				},
				checkbox: true,
			},
			{
				id: 'toggle-tool-lock',
				label: 'action.toggle-tool-lock',
				menuLabel: 'action.toggle-tool-lock.menu',
				readonlyOk: false,
				kbd: 'q',
				onSelect(source) {
					trackEvent('toggle-tool-lock', { source })
					editor.updateInstanceState({ isToolLocked: !editor.getInstanceState().isToolLocked })
				},
				checkbox: true,
			},
			{
				id: 'unlock-all',
				label: 'action.unlock-all',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('unlock-all', { source })
					const updates = [] as TLShapePartial[]
					for (const shape of editor.getCurrentPageShapes()) {
						if (shape.isLocked) {
							updates.push({ id: shape.id, type: shape.type, isLocked: false })
						}
					}
					if (updates.length > 0) {
						editor.updateShapes(updates)
					}
				},
			},
			{
				id: 'toggle-focus-mode',
				label: 'action.toggle-focus-mode',
				menuLabel: 'action.toggle-focus-mode.menu',
				readonlyOk: true,
				kbd: '$.',
				checkbox: true,
				onSelect(source) {
					// this needs to be deferred because it causes the menu
					// UI to unmount which puts us in a dodgy state
					requestAnimationFrame(() => {
						editor.batch(() => {
							trackEvent('toggle-focus-mode', { source })
							clearDialogs()
							clearToasts()
							editor.updateInstanceState({ isFocusMode: !editor.getInstanceState().isFocusMode })
						})
					})
				},
			},
			{
				id: 'toggle-grid',
				label: 'action.toggle-grid',
				menuLabel: 'action.toggle-grid.menu',
				readonlyOk: true,
				kbd: "$'",
				onSelect(source) {
					trackEvent('toggle-grid-mode', { source })
					editor.updateInstanceState({ isGridMode: !editor.getInstanceState().isGridMode })
				},
				checkbox: true,
			},
			{
				id: 'toggle-debug-mode',
				label: 'action.toggle-debug-mode',
				menuLabel: 'action.toggle-debug-mode.menu',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-debug-mode', { source })
					editor.updateInstanceState({
						isDebugMode: !editor.getInstanceState().isDebugMode,
					})
				},
				checkbox: true,
			},
			{
				id: 'print',
				label: 'action.print',
				kbd: '$p',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('print', { source })
					printSelectionOrPages()
				},
			},
			{
				id: 'exit-pen-mode',
				label: 'action.exit-pen-mode',
				icon: 'cross-2',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('exit-pen-mode', { source })
					editor.updateInstanceState({ isPenMode: false })
				},
			},
			{
				id: 'stop-following',
				label: 'action.stop-following',
				icon: 'cross-2',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('stop-following', { source })
					editor.stopFollowingUser()
				},
			},
			{
				id: 'back-to-content',
				label: 'action.back-to-content',
				icon: 'arrow-left',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-to-content', { source })
					editor.zoomToContent()
				},
			},
			{
				id: 'toggle-lock',
				label: 'action.toggle-lock',
				readonlyOk: false,
				kbd: '!l',
				onSelect(source) {
					editor.mark('locking')
					trackEvent('toggle-lock', { source })
					editor.toggleLock(editor.getSelectedShapeIds())
				},
			},
		]

		const actions = makeActions(actionItems)

		if (overrides) {
			return overrides(editor, actions, undefined)
		}

		return actions
	}, [
		editor,
		trackEvent,
		overrides,
		addDialog,
		insertMedia,
		exportAs,
		copyAs,
		cut,
		copy,
		paste,
		clearDialogs,
		clearToasts,
		printSelectionOrPages,
	])

	return <ActionsContext.Provider value={asActions(actions)}>{children}</ActionsContext.Provider>
}

/** @public */
export function useActions() {
	const ctx = React.useContext(ActionsContext)

	if (!ctx) {
		throw new Error('useTools must be used within a ToolProvider')
	}

	return ctx
}

function asActions<T extends Record<string, TLUiActionItem>>(actions: T) {
	return actions as Record<keyof typeof actions, TLUiActionItem>
}
