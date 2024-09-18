import {
	Box,
	DefaultColorStyle,
	DefaultFillStyle,
	Editor,
	HALF_PI,
	PageRecordType,
	TLBookmarkShape,
	TLEmbedShape,
	TLFrameShape,
	TLGroupShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	Vec,
	approximately,
	compact,
	createShapeId,
	openWindow,
	useEditor,
	useValue,
} from '@tldraw/editor'
import * as React from 'react'
import { kickoutOccludedShapes } from '../../tools/SelectTool/selectHelpers'
import { fitFrameToContent, removeFrame } from '../../utils/frames/frames'
import { EditLinkDialog } from '../components/EditLinkDialog'
import { EmbedDialog } from '../components/EmbedDialog'
import {
	showMenuPaste,
	useAllowGroup,
	useAllowUngroup,
	useCanFitFrameToContent,
	useCanFlattenToImage,
	useCanRemoveFrame,
	useCanUnlockAll,
	useHasLinkShapeSelected,
	useIsFollowingUser,
	useIsInSelectState,
	useOneEmbedSelected,
	useOneEmbeddableBookmarkSelected,
	useOnlyFlippableShape,
	useShowBackToContent,
	useThreeStackableItems,
	useUnlockedSelectedShapesCount,
} from '../hooks/menu-hooks'
import { useMenuClipboardEvents } from '../hooks/useClipboardEvents'
import { useCopyAs } from '../hooks/useCopyAs'
import { useExportAs } from '../hooks/useExportAs'
import { flattenShapesToImages } from '../hooks/useFlatten'
import { useGetEmbedDefinition } from '../hooks/useGetEmbedDefinition'
import { useInsertMedia } from '../hooks/useInsertMedia'
import { useShowCollaborationUi } from '../hooks/useIsMultiplayer'
import { usePrint } from '../hooks/usePrint'
import { TLUiTranslationKey } from '../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../icon-types'
import { useDialogs } from './dialogs'
import { TLUiEventSource, useUiEvents } from './events'
import { useToasts } from './toasts'

/** @public */
export interface TLUiActionItem<
	TransationKey extends string = string,
	IconType extends string = string,
> {
	icon?: IconType
	id: string
	kbd?: string
	label?: TransationKey | { [key: string]: TransationKey }
	readonlyOk?: boolean
	checkbox?: boolean
	onSelect(source: TLUiEventSource): Promise<void> | void
	enabled(): boolean
	disabledDescription?: TransationKey
}

/** @public */
export type TLUiActionsContextType = Record<string, TLUiActionItem>

/** @internal */
export const ActionsContext = React.createContext<TLUiActionsContextType | null>(null)

/** @public */
export interface ActionsProviderProps {
	overrides?(
		editor: Editor,
		actions: TLUiActionsContextType,
		helpers: undefined
	): TLUiActionsContextType
	children: React.ReactNode
}

function makeActions(actions: TLUiActionItem[]) {
	return Object.fromEntries(actions.map((action) => [action.id, action])) as TLUiActionsContextType
}

function getExportName(editor: Editor, defaultName: string) {
	const selectedShapes = editor.getSelectedShapes()
	// When we don't have any shapes selected, we want to use the document name
	if (selectedShapes.length === 0) {
		return editor.getDocumentSettings().name || defaultName
	}
	return undefined
}

function getSelectedOrPageShapeIds(editor: Editor) {
	let ids = editor.getSelectedShapeIds()
	if (ids.length === 0) ids = Array.from(editor.getCurrentPageShapeIds().values())
	if (ids.length === 0) return
	return ids
}

/** @internal */
export function ActionsProvider({ overrides, children }: ActionsProviderProps) {
	const editor = useEditor()
	const showCollaborationUi = useShowCollaborationUi()

	const { addDialog, clearDialogs } = useDialogs()
	const { clearToasts, addToast } = useToasts()
	const msg = useTranslation()

	const insertMedia = useInsertMedia()
	const printSelectionOrPages = usePrint()
	const { cut, copy, paste } = useMenuClipboardEvents()
	const copyAs = useCopyAs()
	const exportAs = useExportAs()
	const defaultDocumentName = msg('document.default-name')

	const oneSelected = useUnlockedSelectedShapesCount(1)
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const threeSelected = useUnlockedSelectedShapesCount(3)
	const threeStackableItems = useThreeStackableItems()

	const isInSelectState = useIsInSelectState()
	const showEditLink = useHasLinkShapeSelected()

	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()

	const alignEnabled = !!(twoSelected && isInSelectState)
	const distributeEnabled = !!(threeSelected && isInSelectState)
	const stackingEnabled = threeStackableItems && isInSelectState
	const reorderingEnabled = !!(oneSelected && isInSelectState)
	const rotateEnabled = !!(oneSelected && isInSelectState)
	const editLinkEnabled = !!oneSelected && showEditLink
	const cursorChatEnabled =
		editor.getCurrentToolId() === 'select' && !editor.getInstanceState().isCoarsePointer
	const convertToEmbedEnabled = useOneEmbeddableBookmarkSelected()
	const convertToBookmarkEnabled = useOneEmbedSelected()
	const flattenToImagesEnabled = useCanFlattenToImage()
	const removeFrameEnabled = useCanRemoveFrame()
	const fitFrameToContentEnabled = useCanFitFrameToContent()
	const unlockAllEnabled = useCanUnlockAll()
	const pageHasShapes = editor.getCurrentPageShapeIds().size >= 1
	const onlyFlippableShapeSelected = useOnlyFlippableShape()
	const isFollowingUser = useIsFollowingUser()
	const [backToContentEnabled] = useShowBackToContent()
	const undoEnabled = useValue('undo enabled', () => editor.getCanUndo(), [editor])
	const redoEnabled = useValue('redo enabled', () => editor.getCanRedo(), [editor])

	const getEmbedDefinition = useGetEmbedDefinition()

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

		function canApplySelectionAction() {
			return editor.isIn('select') && editor.getSelectedShapeIds().length > 0
		}

		const actionItems: TLUiActionItem<TLUiTranslationKey, TLUiIconType>[] = [
			{
				id: 'edit-link',
				label: 'action.edit-link',
				icon: 'link',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('edit-link', { source })
					editor.markHistoryStoppingPoint('edit-link')
					addDialog({ component: EditLinkDialog })
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && editLinkEnabled
				},
				disabledDescription: 'action.edit-link-disabled-description',
			},
			{
				id: 'insert-embed',
				label: 'action.insert-embed',
				kbd: '$i',
				onSelect(source) {
					trackEvent('insert-embed', { source })
					addDialog({ component: EmbedDialog })
				},
				enabled() {
					return true
				},
			},
			{
				id: 'insert-media',
				label: 'action.insert-media',
				kbd: '$u',
				onSelect(source) {
					trackEvent('insert-media', { source })
					insertMedia()
				},
				enabled() {
					return true
				},
			},
			{
				id: 'undo',
				label: 'action.undo',
				icon: 'undo',
				kbd: '$z',
				onSelect(source) {
					if (!this.enabled()) return
					trackEvent('undo', { source })
					editor.undo()
				},
				enabled() {
					return undoEnabled
				},
				disabledDescription: 'action.undo-disabled-description',
			},
			{
				id: 'redo',
				label: 'action.redo',
				icon: 'redo',
				kbd: '$!z',
				onSelect(source) {
					if (!this.enabled()) return
					trackEvent('redo', { source })
					editor.redo()
				},
				enabled() {
					return redoEnabled
				},
				disabledDescription: 'action.redo-disabled-description',
			},
			{
				id: 'export-as-svg',
				label: {
					default: 'action.export-as-svg',
					menu: 'action.export-as-svg.short',
					['context-menu']: 'action.export-as-svg.short',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = getSelectedOrPageShapeIds(editor)!
					trackEvent('export-as', { format: 'svg', source })
					exportAs(ids, 'svg', getExportName(editor, defaultDocumentName))
				},
				enabled() {
					const ids = getSelectedOrPageShapeIds(editor)
					return !!ids && pageHasShapes
				},
				disabledDescription: 'action.export-as-disabled-description',
			},
			{
				id: 'export-as-png',
				label: {
					default: 'action.export-as-png',
					menu: 'action.export-as-png.short',
					['context-menu']: 'action.export-as-png.short',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = getSelectedOrPageShapeIds(editor)!
					trackEvent('export-as', { format: 'png', source })
					exportAs(ids, 'png', getExportName(editor, defaultDocumentName))
				},
				enabled() {
					const ids = getSelectedOrPageShapeIds(editor)!
					return !!ids && pageHasShapes
				},
				disabledDescription: 'action.export-as-disabled-description',
			},
			{
				id: 'export-as-json',
				label: {
					default: 'action.export-as-json',
					menu: 'action.export-as-json.short',
					['context-menu']: 'action.export-as-json.short',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = getSelectedOrPageShapeIds(editor)!

					trackEvent('export-as', { format: 'json', source })
					exportAs(ids, 'json', getExportName(editor, defaultDocumentName))
				},
				enabled() {
					const ids = getSelectedOrPageShapeIds(editor)!
					return !!ids && pageHasShapes
				},
				disabledDescription: 'action.export-as-disabled-description',
			},
			{
				id: 'export-all-as-svg',
				label: {
					default: 'action.export-all-as-svg',
					menu: 'action.export-all-as-svg.short',
					['context-menu']: 'action.export-all-as-svg.short',
					'command-bar': 'action.export-all-as-svg.long',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('export-all-as', { format: 'svg', source })
					exportAs(
						Array.from(editor.getCurrentPageShapeIds()),
						'svg',
						getExportName(editor, defaultDocumentName)
					)
				},
				enabled() {
					const ids = editor.getCurrentPageShapeIds()
					return ids.size > 0
				},
				disabledDescription: 'action.export-as-disabled-description',
			},
			{
				id: 'export-all-as-png',
				label: {
					default: 'action.export-all-as-png',
					menu: 'action.export-all-as-png.short',
					['context-menu']: 'action.export-all-as-png.short',
					'command-bar': 'action.export-all-as-png.long',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = Array.from(editor.getCurrentPageShapeIds().values())
					trackEvent('export-all-as', { format: 'png', source })
					exportAs(ids, 'png', getExportName(editor, defaultDocumentName))
				},
				enabled() {
					const ids = editor.getCurrentPageShapeIds()
					return ids.size > 0
				},
				disabledDescription: 'action.export-as-disabled-description',
			},
			{
				id: 'export-all-as-json',
				label: {
					default: 'action.export-all-as-json',
					menu: 'action.export-all-as-json.short',
					['context-menu']: 'action.export-all-as-json.short',
					'command-bar': 'action.export-all-as-json.long',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = Array.from(editor.getCurrentPageShapeIds().values())
					trackEvent('export-all-as', { format: 'json', source })
					exportAs(ids, 'json', getExportName(editor, defaultDocumentName))
				},
				enabled() {
					const ids = editor.getCurrentPageShapeIds()
					return ids.size > 0
				},
				disabledDescription: 'action.export-as-disabled-description',
			},
			{
				id: 'copy-as-svg',
				label: {
					default: 'action.copy-as-svg',
					menu: 'action.copy-as-svg.short',
					['context-menu']: 'action.copy-as-svg.short',
				},
				kbd: '$!c',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = getSelectedOrPageShapeIds(editor)!
					trackEvent('copy-as', { format: 'svg', source })
					copyAs(ids, 'svg')
				},
				enabled() {
					const ids = getSelectedOrPageShapeIds(editor)
					return !!ids
				},
				disabledDescription: 'action.copy-as-disabled-description',
			},
			{
				id: 'copy-as-png',
				label: {
					default: 'action.copy-as-png',
					menu: 'action.copy-as-png.short',
					['context-menu']: 'action.copy-as-png.short',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = getSelectedOrPageShapeIds(editor)!
					trackEvent('copy-as', { format: 'png', source })
					copyAs(ids, 'png')
				},
				enabled() {
					const ids = getSelectedOrPageShapeIds(editor)
					return !!ids
				},
				disabledDescription: 'action.copy-as-disabled-description',
			},
			{
				id: 'copy-as-json',
				label: {
					default: 'action.copy-as-json',
					menu: 'action.copy-as-json.short',
					['context-menu']: 'action.copy-as-json.short',
				},
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					const ids = getSelectedOrPageShapeIds(editor)!
					trackEvent('copy-as', { format: 'json', source })
					copyAs(ids, 'json')
				},
				enabled() {
					const ids = getSelectedOrPageShapeIds(editor)
					return !!ids
				},
				disabledDescription: 'action.copy-as-disabled-description',
			},
			{
				id: 'toggle-auto-size',
				label: 'action.toggle-auto-size',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('toggle-auto-size', { source })
					editor.markHistoryStoppingPoint('toggling auto size')
					const shapes = editor
						.getSelectedShapes()
						.filter(
							(shape): shape is TLTextShape =>
								editor.isShapeOfType<TLTextShape>(shape, 'text') && shape.props.autoSize === false
						)
					editor.updateShapes(
						shapes.map((shape) => {
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
					kickoutOccludedShapes(
						editor,
						shapes.map((shape) => shape.id)
					)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst()
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
				enabled() {
					return true
				},
			},
			{
				id: 'select-zoom-tool',
				readonlyOk: true,
				kbd: 'z',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('zoom-tool', { source })
					if (!(editor.inputs.shiftKey || editor.inputs.ctrlKey)) {
						const currentTool = editor.root.getCurrent()
						if (currentTool && currentTool.getCurrent()?.id === 'idle') {
							editor.setCurrentTool('zoom', { onInteractionEnd: currentTool.id, maskAs: 'zoom' })
						}
					}
				},
				enabled() {
					return editor.root.getCurrent()?.id !== 'zoom'
				},
			},
			{
				id: 'convert-to-bookmark',
				label: 'action.convert-to-bookmark',
				onSelect(source) {
					if (!this.enabled()) return

					editor.run(() => {
						trackEvent('convert-to-bookmark', { source })
						const shapes = editor.getSelectedShapes()

						const createList: TLShapePartial[] = []
						const deleteList: TLShapeId[] = []
						for (const shape of shapes) {
							if (!shape || !editor.isShapeOfType<TLEmbedShape>(shape, 'embed') || !shape.props.url)
								continue

							const newPos = new Vec(shape.x, shape.y)
							newPos.rot(-shape.rotation)
							newPos.add(new Vec(shape.props.w / 2 - 300 / 2, shape.props.h / 2 - 320 / 2)) // see bookmark shape util
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

						editor.markHistoryStoppingPoint('convert shapes to bookmark')
						editor.deleteShapes(deleteList)
						editor.createShapes(createList)
					})
				},
				enabled() {
					return (
						canApplySelectionAction() && !mustGoBackToSelectToolFirst() && convertToBookmarkEnabled
					)
				},
				disabledDescription: 'action.convert-to-bookmark-disabled-description',
			},
			{
				id: 'convert-to-embed',
				label: 'action.convert-to-embed',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('convert-to-embed', { source })

					editor.run(() => {
						const ids = editor.getSelectedShapeIds()
						const shapes = compact(ids.map((id) => editor.getShape(id)))

						const createList: TLShapePartial[] = []
						const deleteList: TLShapeId[] = []
						for (const shape of shapes) {
							if (!editor.isShapeOfType<TLBookmarkShape>(shape, 'bookmark')) continue

							const { url } = shape.props

							const embedInfo = getEmbedDefinition(url)

							if (!embedInfo) continue
							if (!embedInfo.definition) continue

							const { width, height } = embedInfo.definition

							const newPos = new Vec(shape.x, shape.y)
							newPos.rot(-shape.rotation)
							newPos.add(new Vec(shape.props.w / 2 - width / 2, shape.props.h / 2 - height / 2))
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

						editor.markHistoryStoppingPoint('convert shapes to embed')
						editor.deleteShapes(deleteList)
						editor.createShapes(createList)
					})
				},
				enabled() {
					return (
						canApplySelectionAction() && !mustGoBackToSelectToolFirst() && convertToEmbedEnabled
					)
				},
				disabledDescription: 'action.convert-to-embed-disabled-description',
			},
			{
				id: 'duplicate',
				kbd: '$d',
				label: 'action.duplicate',
				icon: 'duplicate',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('duplicate-shapes', { source })
					const instanceState = editor.getInstanceState()
					let ids: TLShapeId[]
					let offset: { x: number; y: number }

					if (instanceState.duplicateProps) {
						ids = instanceState.duplicateProps.shapeIds
						offset = instanceState.duplicateProps.offset
					} else {
						ids = editor.getSelectedShapeIds()
						const commonBounds = Box.Common(compact(ids.map((id) => editor.getShapePageBounds(id))))
						offset = editor.getCameraOptions().isLocked
							? {
									// same as the adjacent note margin
									x: editor.options.adjacentShapeMargin,
									y: editor.options.adjacentShapeMargin,
								}
							: {
									x: commonBounds.width + editor.options.adjacentShapeMargin,
									y: 0,
								}
					}

					editor.markHistoryStoppingPoint('duplicate shapes')
					editor.duplicateShapes(ids, offset)

					if (instanceState.duplicateProps) {
						// If we are using duplicate props then we update the shape ids to the
						// ids of the newly created shapes to keep the duplication going
						editor.updateInstanceState({
							duplicateProps: {
								...instanceState.duplicateProps,
								shapeIds: editor.getSelectedShapeIds(),
							},
						})
					}
				},
				enabled() {
					return (
						canApplySelectionAction() &&
						!mustGoBackToSelectToolFirst() &&
						!!(oneSelected && isInSelectState)
					)
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'ungroup',
				label: 'action.ungroup',
				kbd: '$!g',
				icon: 'ungroup',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('ungroup-shapes', { source })
					editor.markHistoryStoppingPoint('ungroup')
					editor.ungroupShapes(editor.getSelectedShapeIds())
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && allowUngroup
				},
				disabledDescription: 'action.ungroup-disabled-description',
			},
			{
				id: 'group',
				label: 'action.group',
				kbd: '$g',
				icon: 'group',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('group-shapes', { source })
					const onlySelectedShape = editor.getOnlySelectedShape()
					if (onlySelectedShape && editor.isShapeOfType<TLGroupShape>(onlySelectedShape, 'group')) {
						editor.markHistoryStoppingPoint('ungroup')
						editor.ungroupShapes(editor.getSelectedShapeIds())
					} else {
						editor.markHistoryStoppingPoint('group')
						editor.groupShapes(editor.getSelectedShapeIds())
					}
				},
				enabled() {
					return (
						canApplySelectionAction() &&
						!mustGoBackToSelectToolFirst() &&
						!!(allowGroup && twoSelected && isInSelectState)
					)
				},
				disabledDescription: 'action.group-disabled-description',
			},
			{
				id: 'remove-frame',
				label: 'action.remove-frame',
				kbd: '$!f',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('remove-frame', { source })
					const selectedShapes = editor.getSelectedShapes()
					if (
						selectedShapes.length > 0 &&
						selectedShapes.every((shape) => editor.isShapeOfType<TLFrameShape>(shape, 'frame'))
					) {
						editor.markHistoryStoppingPoint('remove-frame')
						removeFrame(
							editor,
							selectedShapes.map((shape) => shape.id)
						)
					}
				},
				enabled() {
					return canApplySelectionAction() && removeFrameEnabled
				},
				disabledDescription: 'action.remove-frame-disabled-description',
			},
			{
				id: 'fit-frame-to-content',
				label: 'action.fit-frame-to-content',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('fit-frame-to-content', { source })
					const onlySelectedShape = editor.getOnlySelectedShape()
					if (onlySelectedShape && editor.isShapeOfType<TLFrameShape>(onlySelectedShape, 'frame')) {
						editor.markHistoryStoppingPoint('fit-frame-to-content')
						fitFrameToContent(editor, onlySelectedShape.id)
					}
				},
				enabled() {
					return canApplySelectionAction() && fitFrameToContentEnabled
				},
				disabledDescription: 'action.fit-frame-to-content-disabled-description',
			},
			{
				id: 'align-left',
				label: 'action.align-left',
				kbd: '?A',
				icon: 'align-left',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('align-shapes', { operation: 'left', source })
					editor.markHistoryStoppingPoint('align left')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.alignShapes(selectedShapeIds, 'left')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'align-center-horizontal',
				label: {
					default: 'action.align-center-horizontal',
					['context-menu']: 'action.align-center-horizontal.short',
				},
				kbd: '?H',
				icon: 'align-center-horizontal',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('align-shapes', { operation: 'center-horizontal', source })
					editor.markHistoryStoppingPoint('align center horizontal')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.alignShapes(selectedShapeIds, 'center-horizontal')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'align-right',
				label: 'action.align-right',
				kbd: '?D',
				icon: 'align-right',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('align-shapes', { operation: 'right', source })
					editor.markHistoryStoppingPoint('align right')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.alignShapes(selectedShapeIds, 'right')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'align-center-vertical',
				label: {
					default: 'action.align-center-vertical',
					['context-menu']: 'action.align-center-vertical.short',
				},
				kbd: '?V',
				icon: 'align-center-vertical',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('align-shapes', { operation: 'center-vertical', source })
					editor.markHistoryStoppingPoint('align center vertical')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.alignShapes(selectedShapeIds, 'center-vertical')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'align-top',
				label: 'action.align-top',
				icon: 'align-top',
				kbd: '?W',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('align-shapes', { operation: 'top', source })
					editor.markHistoryStoppingPoint('align top')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.alignShapes(selectedShapeIds, 'top')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'align-bottom',
				label: 'action.align-bottom',
				icon: 'align-bottom',
				kbd: '?S',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('align-shapes', { operation: 'bottom', source })
					editor.markHistoryStoppingPoint('align bottom')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.alignShapes(selectedShapeIds, 'bottom')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'distribute-horizontal',
				label: {
					default: 'action.distribute-horizontal',
					['context-menu']: 'action.distribute-horizontal.short',
				},
				icon: 'distribute-horizontal',
				kbd: '?!h',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('distribute-shapes', { operation: 'horizontal', source })
					editor.markHistoryStoppingPoint('distribute horizontal')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.distributeShapes(selectedShapeIds, 'horizontal')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && distributeEnabled
				},
				disabledDescription: 'action.distribute-disabled-description',
			},
			{
				id: 'distribute-vertical',
				label: {
					default: 'action.distribute-vertical',
					['context-menu']: 'action.distribute-vertical.short',
				},
				icon: 'distribute-vertical',
				kbd: '?!V',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('distribute-shapes', { operation: 'vertical', source })
					editor.markHistoryStoppingPoint('distribute vertical')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.distributeShapes(selectedShapeIds, 'vertical')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && distributeEnabled
				},
				disabledDescription: 'action.distribute-disabled-description',
			},
			{
				id: 'stretch-horizontal',
				label: {
					default: 'action.stretch-horizontal',
					['context-menu']: 'action.stretch-horizontal.short',
				},
				icon: 'stretch-horizontal',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('stretch-shapes', { operation: 'horizontal', source })
					editor.markHistoryStoppingPoint('stretch horizontal')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.stretchShapes(selectedShapeIds, 'horizontal')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'stretch-vertical',
				label: {
					default: 'action.stretch-vertical',
					['context-menu']: 'action.stretch-vertical.short',
				},
				icon: 'stretch-vertical',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('stretch-shapes', { operation: 'vertical', source })
					editor.markHistoryStoppingPoint('stretch vertical')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.stretchShapes(selectedShapeIds, 'vertical')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && alignEnabled
				},
				disabledDescription: 'action.align-disabled-description',
			},
			{
				id: 'flip-horizontal',
				label: {
					default: 'action.flip-horizontal',
					['context-menu']: 'action.flip-horizontal.short',
				},
				kbd: '!h',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('flip-shapes', { operation: 'horizontal', source })
					editor.markHistoryStoppingPoint('flip horizontal')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.flipShapes(selectedShapeIds, 'horizontal')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return (
						canApplySelectionAction() &&
						!mustGoBackToSelectToolFirst() &&
						!!(twoSelected || onlyFlippableShapeSelected)
					)
				},
			},
			{
				id: 'flip-vertical',
				label: { default: 'action.flip-vertical', ['context-menu']: 'action.flip-vertical.short' },
				kbd: '!v',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('flip-shapes', { operation: 'vertical', source })
					editor.markHistoryStoppingPoint('flip vertical')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.flipShapes(selectedShapeIds, 'vertical')
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return (
						canApplySelectionAction() &&
						!mustGoBackToSelectToolFirst() &&
						!!(twoSelected || onlyFlippableShapeSelected)
					)
				},
			},
			{
				id: 'pack',
				label: 'action.pack',
				icon: 'pack',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('pack-shapes', { source })
					editor.markHistoryStoppingPoint('pack')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.packShapes(selectedShapeIds, editor.options.adjacentShapeMargin)
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && threeStackableItems
				},
			},
			{
				id: 'stack-vertical',
				label: {
					default: 'action.stack-vertical',
					['context-menu']: 'action.stack-vertical.short',
				},
				icon: 'stack-vertical',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('stack-shapes', { operation: 'vertical', source })
					editor.markHistoryStoppingPoint('stack-vertical')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.stackShapes(selectedShapeIds, 'vertical', 16)
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && stackingEnabled
				},
			},
			{
				id: 'stack-horizontal',
				label: {
					default: 'action.stack-horizontal',
					['context-menu']: 'action.stack-horizontal.short',
				},
				icon: 'stack-horizontal',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('stack-shapes', { operation: 'horizontal', source })
					editor.markHistoryStoppingPoint('stack-horizontal')
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.stackShapes(selectedShapeIds, 'horizontal', 16)
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && stackingEnabled
				},
			},
			{
				id: 'bring-to-front',
				label: 'action.bring-to-front',
				kbd: ']',
				icon: 'bring-to-front',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('reorder-shapes', { operation: 'toFront', source })
					editor.markHistoryStoppingPoint('bring to front')
					editor.bringToFront(editor.getSelectedShapeIds())
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && reorderingEnabled
				},
			},
			{
				id: 'bring-forward',
				label: 'action.bring-forward',
				icon: 'bring-forward',
				kbd: '?]',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('reorder-shapes', { operation: 'forward', source })
					editor.markHistoryStoppingPoint('bring forward')
					editor.bringForward(editor.getSelectedShapeIds())
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && reorderingEnabled
				},
			},
			{
				id: 'send-backward',
				label: 'action.send-backward',
				icon: 'send-backward',
				kbd: '?[',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('reorder-shapes', { operation: 'backward', source })
					editor.markHistoryStoppingPoint('send backward')
					editor.sendBackward(editor.getSelectedShapeIds())
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && reorderingEnabled
				},
			},
			{
				id: 'send-to-back',
				label: 'action.send-to-back',
				icon: 'send-to-back',
				kbd: '[',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('reorder-shapes', { operation: 'toBack', source })
					editor.markHistoryStoppingPoint('send to back')
					editor.sendToBack(editor.getSelectedShapeIds())
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && reorderingEnabled
				},
			},
			{
				id: 'cut',
				label: 'action.cut',
				kbd: '$x',
				onSelect(source) {
					if (!this.enabled()) return

					editor.markHistoryStoppingPoint('cut')
					cut(source)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && !!oneSelected
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'copy',
				label: 'action.copy',
				kbd: '$c',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return

					copy(source)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && !!oneSelected
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'paste',
				label: 'action.paste',
				kbd: '$v',
				onSelect(source) {
					if (!this.enabled()) return
					navigator.clipboard
						?.read()
						.then((clipboardItems) => {
							paste(
								clipboardItems,
								source,
								source === 'context-menu' ? editor.inputs.currentPagePoint : undefined
							)
						})
						.catch(() => {
							addToast({
								title: msg('action.paste-error-title'),
								description: msg('action.paste-error-description'),
								severity: 'error',
							})
						})
				},
				enabled() {
					return showMenuPaste
				},
				disabledDescription: 'action.paste-disabled-description',
			},
			{
				id: 'select-all',
				label: 'action.select-all',
				kbd: '$a',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					editor.run(() => {
						trackEvent('select-all-shapes', { source })

						editor.markHistoryStoppingPoint('select all kbd')
						editor.selectAll()
					})
				},
				enabled() {
					return !mustGoBackToSelectToolFirst() && pageHasShapes
				},
				disabledDescription: 'action.no-shapes-on-page',
			},
			{
				id: 'select-none',
				label: 'action.select-none',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('select-none-shapes', { source })
					editor.markHistoryStoppingPoint('select none')
					editor.selectNone()
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && !!oneSelected
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'delete',
				label: 'action.delete',
				kbd: '⌫,del,backspace',
				icon: 'trash',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('delete-shapes', { source })
					editor.markHistoryStoppingPoint('delete')
					editor.deleteShapes(editor.getSelectedShapeIds())
				},
				enabled() {
					return (
						canApplySelectionAction() &&
						!mustGoBackToSelectToolFirst() &&
						!!(oneSelected && isInSelectState)
					)
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'rotate-cw',
				label: 'action.rotate-cw',
				icon: 'rotate-cw',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('rotate-cw', { source })
					editor.markHistoryStoppingPoint('rotate-cw')
					const offset = editor.getSelectionRotation() % (HALF_PI / 2)
					const dontUseOffset = approximately(offset, 0) || approximately(offset, HALF_PI / 2)
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.rotateShapesBy(selectedShapeIds, HALF_PI / 2 - (dontUseOffset ? 0 : offset))
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && rotateEnabled
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'rotate-ccw',
				label: 'action.rotate-ccw',
				icon: 'rotate-ccw',
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('rotate-ccw', { source })
					editor.markHistoryStoppingPoint('rotate-ccw')
					const offset = editor.getSelectionRotation() % (HALF_PI / 2)
					const offsetCloseToZero = approximately(offset, 0)
					const selectedShapeIds = editor.getSelectedShapeIds()
					editor.rotateShapesBy(selectedShapeIds, offsetCloseToZero ? -(HALF_PI / 2) : -offset)
					kickoutOccludedShapes(editor, selectedShapeIds)
				},
				enabled() {
					return canApplySelectionAction() && !mustGoBackToSelectToolFirst() && rotateEnabled
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'zoom-in',
				label: 'action.zoom-in',
				kbd: '$=,=',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-in', { source })
					editor.zoomIn(undefined, {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
				enabled() {
					return true
				},
			},
			{
				id: 'zoom-out',
				label: 'action.zoom-out',
				kbd: '$-,-',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-out', { source })
					editor.zoomOut(undefined, {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
				enabled() {
					return true
				},
			},
			{
				id: 'zoom-to-100',
				label: 'action.zoom-to-100',
				icon: 'reset-zoom',
				kbd: '!0',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					trackEvent('reset-zoom', { source })
					editor.resetZoom(undefined, {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
				enabled() {
					return editor.getZoomLevel() !== 1
				},
			},
			{
				id: 'zoom-to-fit',
				label: 'action.zoom-to-fit',
				kbd: '!1',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					trackEvent('zoom-to-fit', { source })
					editor.zoomToFit({ animation: { duration: editor.options.animationMediumMs } })
				},
				enabled() {
					return editor.getCurrentPageShapeIds().size > 0
				},
			},
			{
				id: 'zoom-to-selection',
				label: 'action.zoom-to-selection',
				kbd: '!2',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('zoom-to-selection', { source })
					editor.zoomToSelection({ animation: { duration: editor.options.animationMediumMs } })
				},
				enabled() {
					return (
						canApplySelectionAction() &&
						!mustGoBackToSelectToolFirst() &&
						editor.getCurrentPageShapeIds().size > 0
					)
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'toggle-snap-mode',
				label: {
					default: 'action.toggle-snap-mode',
					menu: 'action.toggle-snap-mode.menu',
				},
				onSelect(source) {
					trackEvent('toggle-snap-mode', { source })
					editor.user.updateUserPreferences({ isSnapMode: !editor.user.getIsSnapMode() })
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-dark-mode',
				label: {
					default: 'action.toggle-dark-mode',
					menu: 'action.toggle-dark-mode.menu',
				},
				kbd: '$/',
				readonlyOk: true,
				onSelect(source) {
					const value = editor.user.getIsDarkMode() ? 'light' : 'dark'
					trackEvent('color-scheme', { source, value })
					editor.user.updateUserPreferences({
						colorScheme: value,
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-wrap-mode',
				label: {
					default: 'action.toggle-wrap-mode',
					menu: 'action.toggle-wrap-mode.menu',
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-wrap-mode', { source })
					editor.user.updateUserPreferences({
						isWrapMode: !editor.user.getIsWrapMode(),
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-dynamic-size-mode',
				label: {
					default: 'action.toggle-dynamic-size-mode',
					menu: 'action.toggle-dynamic-size-mode.menu',
				},
				readonlyOk: false,
				onSelect(source) {
					trackEvent('toggle-dynamic-size-mode', { source })
					editor.user.updateUserPreferences({
						isDynamicSizeMode: !editor.user.getIsDynamicResizeMode(),
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-paste-at-cursor',
				label: {
					default: 'action.toggle-paste-at-cursor',
					menu: 'action.toggle-paste-at-cursor.menu',
				},
				readonlyOk: false,
				onSelect(source) {
					trackEvent('toggle-paste-at-cursor', { source })
					editor.user.updateUserPreferences({
						isPasteAtCursorMode: !editor.user.getIsPasteAtCursorMode(),
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-reduce-motion',
				label: {
					default: 'action.toggle-reduce-motion',
					menu: 'action.toggle-reduce-motion.menu',
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-reduce-motion', { source })
					editor.user.updateUserPreferences({
						animationSpeed: editor.user.getAnimationSpeed() === 0 ? 1 : 0,
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-edge-scrolling',
				label: {
					default: 'action.toggle-edge-scrolling',
					menu: 'action.toggle-edge-scrolling.menu',
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-edge-scrolling', { source })
					editor.user.updateUserPreferences({
						edgeScrollSpeed: editor.user.getEdgeScrollSpeed() === 0 ? 1 : 0,
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-transparent',
				label: {
					default: 'action.toggle-transparent',
					menu: 'action.toggle-transparent.menu',
					['context-menu']: 'action.toggle-transparent.context-menu',
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-transparent', { source })
					editor.updateInstanceState({
						exportBackground: !editor.getInstanceState().exportBackground,
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-tool-lock',
				label: {
					default: 'action.toggle-tool-lock',
					menu: 'action.toggle-tool-lock.menu',
				},
				kbd: 'q',
				onSelect(source) {
					trackEvent('toggle-tool-lock', { source })
					editor.updateInstanceState({ isToolLocked: !editor.getInstanceState().isToolLocked })
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'unlock-all',
				label: 'action.unlock-all',
				onSelect(source) {
					if (!this.enabled()) return
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
				enabled() {
					return unlockAllEnabled
				},
				disabledDescription: 'action.no-shapes-on-page',
			},
			{
				id: 'toggle-focus-mode',
				label: {
					default: 'action.toggle-focus-mode',
					menu: 'action.toggle-focus-mode.menu',
				},
				readonlyOk: true,
				kbd: '$.',
				checkbox: true,
				onSelect(source) {
					// this needs to be deferred because it causes the menu
					// UI to unmount which puts us in a dodgy state
					editor.timers.requestAnimationFrame(() => {
						editor.run(() => {
							trackEvent('toggle-focus-mode', { source })
							clearDialogs()
							clearToasts()
							editor.updateInstanceState({ isFocusMode: !editor.getInstanceState().isFocusMode })
						})
					})
				},
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-grid',
				label: {
					default: 'action.toggle-grid',
					menu: 'action.toggle-grid.menu',
				},
				readonlyOk: true,
				kbd: "$'",
				onSelect(source) {
					trackEvent('toggle-grid-mode', { source })
					editor.updateInstanceState({ isGridMode: !editor.getInstanceState().isGridMode })
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'toggle-debug-mode',
				label: {
					default: 'action.toggle-debug-mode',
					menu: 'action.toggle-debug-mode.menu',
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-debug-mode', { source })
					editor.updateInstanceState({
						isDebugMode: !editor.getInstanceState().isDebugMode,
					})
				},
				checkbox: true,
				enabled() {
					return true
				},
			},
			{
				id: 'print',
				label: 'action.print',
				kbd: '$p',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					trackEvent('print', { source })
					printSelectionOrPages()
				},
				enabled() {
					return pageHasShapes
				},
				disabledDescription: 'action.no-shapes-on-page',
			},
			{
				id: 'exit-pen-mode',
				label: 'action.exit-pen-mode',
				icon: 'cross-2',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					trackEvent('exit-pen-mode', { source })
					editor.updateInstanceState({ isPenMode: false })
				},
				enabled() {
					return editor.getInstanceState().isPenMode
				},
				disabledDescription: 'action.exit-pen-mode-disabled-description',
			},
			{
				id: 'stop-following',
				label: 'action.stop-following',
				icon: 'cross-2',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return
					trackEvent('stop-following', { source })
					editor.stopFollowingUser()
				},
				enabled() {
					return isFollowingUser
				},
				disabledDescription: 'action.stop-following-disabled-description',
			},
			{
				id: 'back-to-content',
				label: 'action.back-to-content',
				icon: 'arrow-left',
				readonlyOk: true,
				onSelect(source) {
					if (!this.enabled()) return

					trackEvent('zoom-to-content', { source })
					const bounds = editor.getSelectionPageBounds() ?? editor.getCurrentPageBounds()!
					editor.zoomToBounds(bounds, {
						targetZoom: Math.min(1, editor.getZoomLevel()),
						animation: { duration: 220 },
					})
				},
				enabled() {
					const bounds = editor.getSelectionPageBounds() ?? editor.getCurrentPageBounds()
					return !!bounds && backToContentEnabled
				},
			},
			{
				id: 'toggle-lock',
				label: 'action.toggle-lock',
				kbd: '!l',
				onSelect(source) {
					if (!this.enabled()) return
					editor.markHistoryStoppingPoint('locking')
					trackEvent('toggle-lock', { source })
					editor.toggleLock(editor.getSelectedShapeIds())
				},
				enabled() {
					return !!oneSelected
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'move-to-new-page',
				label: {
					default: 'context.pages.new-page',
					'command-bar': 'command-bar.move-to-new-page',
				},
				onSelect(source) {
					if (!this.enabled()) return
					const newPageId = PageRecordType.createId()
					const ids = editor.getSelectedShapeIds()
					editor.run(() => {
						editor.markHistoryStoppingPoint('move_shapes_to_page')
						editor.createPage({ name: msg('page-menu.new-page-initial-name'), id: newPageId })
						editor.moveShapesToPage(ids, newPageId)
					})
					trackEvent('move-to-new-page', { source })
				},
				enabled() {
					return !!(oneSelected && editor.options.maxPages > 1)
				},
				disabledDescription: 'action.no-shapes-selected',
			},
			{
				id: 'select-white-color',
				label: 'color-style.white',
				kbd: '?t',
				onSelect(source) {
					const style = DefaultColorStyle
					editor.run(() => {
						editor.markHistoryStoppingPoint('change-color')
						if (editor.isIn('select')) {
							editor.setStyleForSelectedShapes(style, 'white')
						}
						editor.setStyleForNextShapes(style, 'white')
					})
					trackEvent('set-style', { source, id: style.id, value: 'white' })
				},
				enabled() {
					return true
				},
			},
			{
				id: 'select-fill-fill',
				label: 'fill-style.fill',
				kbd: '?f',
				onSelect(source) {
					const style = DefaultFillStyle
					editor.run(() => {
						editor.markHistoryStoppingPoint('change-fill')
						if (editor.isIn('select')) {
							editor.setStyleForSelectedShapes(style, 'fill')
						}
						editor.setStyleForNextShapes(style, 'fill')
					})
					trackEvent('set-style', { source, id: style.id, value: 'fill' })
				},
				enabled() {
					return true
				},
			},
			{
				id: 'flatten-to-image',
				label: 'action.flatten-to-image',
				kbd: '!f',
				onSelect: async function (source) {
					if (!this.enabled()) return
					const ids = editor.getSelectedShapeIds()

					editor.markHistoryStoppingPoint('flattening to image')
					trackEvent('flatten-to-image', { source })

					const newShapeIds = await flattenShapesToImages(
						editor,
						ids,
						editor.options.flattenImageBoundsExpand
					)

					if (newShapeIds?.length) {
						editor.setSelectedShapes(newShapeIds)
					}
				},
				enabled() {
					const ids = editor.getSelectedShapeIds()
					return ids.length > 0 && flattenToImagesEnabled
				},
				disabledDescription: 'action.flatten-to-image-disabled-description',
			},
		]

		if (showCollaborationUi) {
			actionItems.push({
				id: 'open-cursor-chat',
				label: 'action.open-cursor-chat',
				readonlyOk: true,
				kbd: '/',
				onSelect(source: any) {
					if (!this.enabled()) return
					trackEvent('open-cursor-chat', { source })

					// Don't open cursor chat if we're on a touch device
					if (editor.getInstanceState().isCoarsePointer) {
						return
					}

					// wait a frame before opening as otherwise the open context menu will close it
					editor.timers.requestAnimationFrame(() => {
						editor.updateInstanceState({ isChatting: true })
					})
				},
				enabled() {
					return cursorChatEnabled
				},
			})
		}
		actionItems.map((a) => (a.onSelect = a.onSelect.bind(a)))

		const actions = makeActions(actionItems)

		if (overrides) {
			return overrides(editor, actions, undefined)
		}

		return actions
	}, [
		showCollaborationUi,
		overrides,
		editor,
		trackEvent,
		addDialog,
		editLinkEnabled,
		insertMedia,
		undoEnabled,
		redoEnabled,
		exportAs,
		defaultDocumentName,
		pageHasShapes,
		copyAs,
		convertToBookmarkEnabled,
		getEmbedDefinition,
		convertToEmbedEnabled,
		oneSelected,
		isInSelectState,
		allowUngroup,
		allowGroup,
		twoSelected,
		removeFrameEnabled,
		fitFrameToContentEnabled,
		alignEnabled,
		distributeEnabled,
		onlyFlippableShapeSelected,
		threeStackableItems,
		stackingEnabled,
		reorderingEnabled,
		cut,
		copy,
		paste,
		addToast,
		msg,
		rotateEnabled,
		unlockAllEnabled,
		clearDialogs,
		clearToasts,
		printSelectionOrPages,
		isFollowingUser,
		backToContentEnabled,
		flattenToImagesEnabled,
		cursorChatEnabled,
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

/** @public */
export function unwrapLabel(label?: TLUiActionItem['label'], menuType?: string) {
	return label
		? typeof label === 'string'
			? label
			: menuType
				? label[menuType] ?? label['default']
				: undefined
		: undefined
}
