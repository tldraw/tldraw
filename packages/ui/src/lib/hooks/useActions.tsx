import {
	ANIMATION_MEDIUM_MS,
	App,
	DEFAULT_BOOKMARK_HEIGHT,
	DEFAULT_BOOKMARK_WIDTH,
	getEmbedInfo,
	openWindow,
	TLBookmarkShapeDef,
	TLEmbedShapeDef,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	useApp,
} from '@tldraw/editor'
import { approximately, Box2d, TAU, Vec2d } from '@tldraw/primitives'
import { compact } from '@tldraw/utils'
import * as React from 'react'
import { EditLinkDialog } from '../components/EditLinkDialog'
import { EmbedDialog } from '../components/EmbedDialog'
import { TLUiIconType } from '../icon-types'
import { useMenuClipboardEvents } from './useClipboardEvents'
import { useCopyAs } from './useCopyAs'
import { useDialogs } from './useDialogsProvider'
import { TLUiEventSource, useEvents } from './useEventsProvider'
import { useExportAs } from './useExportAs'
import { useInsertMedia } from './useInsertMedia'
import { usePrint } from './usePrint'
import { useToasts } from './useToastsProvider'
import { TLTranslationKey } from './useTranslation/TLTranslationKey'

/** @public */
export interface ActionItem {
	icon?: TLUiIconType
	id: string
	kbd?: string
	title?: string
	label?: TLTranslationKey
	menuLabel?: TLTranslationKey
	shortcutsLabel?: TLTranslationKey
	contextMenuLabel?: TLTranslationKey
	readonlyOk: boolean
	checkbox?: boolean
	onSelect: (source: TLUiEventSource) => Promise<void> | void
}

/** @public */
export type ActionsContextType = Record<string, ActionItem>

/** @public */
export const ActionsContext = React.createContext<ActionsContextType>({})

/** @public */
export type ActionsProviderProps = {
	overrides?: (app: App, actions: ActionsContextType, helpers: undefined) => ActionsContextType
	children: any
}

function makeActions(actions: ActionItem[]) {
	return Object.fromEntries(actions.map((action) => [action.id, action])) as ActionsContextType
}

/** @public */
export function ActionsProvider({ overrides, children }: ActionsProviderProps) {
	const app = useApp()

	// const saveFile = useSaveFile()
	// const saveFileAs = useSaveFileAs()
	// const newFile = useNewFile()
	// const openFile = useOpenFile()

	const { addDialog, clearDialogs } = useDialogs()
	const { clearToasts } = useToasts()

	const insertMedia = useInsertMedia()
	const printSelectionOrPages = usePrint()
	const { cut, copy } = useMenuClipboardEvents('unknown')
	const copyAs = useCopyAs()
	const exportAs = useExportAs()

	const trackEvent = useEvents()

	// should this be a useMemo? looks like it doesn't actually deref any reactive values
	const actions = React.useMemo<ActionsContextType>(() => {
		const actions = makeActions([
			{
				id: 'edit-link',
				label: 'action.edit-link',
				icon: 'link',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('edit-link', { source })
					app.mark('edit-link')
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
					app.undo()
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
					app.redo()
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
					exportAs(app.selectedIds, 'svg')
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
					exportAs(app.selectedIds, 'png')
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
					exportAs(app.selectedIds, 'json')
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
					copyAs(app.selectedIds, 'svg')
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
					copyAs(app.selectedIds, 'png')
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
					copyAs(app.selectedIds, 'json')
				},
			},
			{
				id: 'toggle-auto-size',
				label: 'action.toggle-auto-size',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('toggle-auto-size', { source })
					app.mark()
					app.updateShapes(
						app.selectedShapes
							.filter((shape) => shape && shape.type === 'text' && shape.props.autoSize === false)
							.map((shape: TLTextShape) => {
								return {
									id: shape.id,
									type: shape.type,
									props: {
										...shape.props,
										w: 8,
										autoSize: true,
									},
								} as TLTextShape
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
					const ids = app.selectedIds
					const warnMsg = 'No embed shapes selected'
					if (ids.length !== 1) {
						console.error(warnMsg)
						return
					}
					const shape = app.getShapeById(ids[0])
					if (!shape || !TLEmbedShapeDef.is(shape)) {
						console.error(warnMsg)
						return
					}

					openWindow(shape.props.url, '_blank')
				},
			},
			{
				id: 'convert-to-bookmark',
				label: 'action.convert-to-bookmark',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('convert-to-bookmark', { source })
					const ids = app.selectedIds
					const shapes = ids.map((id) => app.getShapeById(id))

					const createList: TLShapePartial[] = []
					const deleteList: TLShapeId[] = []
					for (const shape of shapes) {
						if (!shape || !TLEmbedShapeDef.is(shape) || !shape.props.url) continue

						const newPos = new Vec2d(shape.x, shape.y)
						newPos.rot(-shape.rotation)
						newPos.add(
							new Vec2d(
								shape.props.w / 2 - DEFAULT_BOOKMARK_WIDTH / 2,
								shape.props.h / 2 - DEFAULT_BOOKMARK_HEIGHT / 2
							)
						)
						newPos.rot(shape.rotation)

						createList.push({
							id: app.createShapeId(),
							type: 'bookmark',
							rotation: shape.rotation,
							x: newPos.x,
							y: newPos.y,
							props: {
								url: shape.props.url,
								opacity: '1',
							},
						})
						deleteList.push(shape.id)
					}

					app.mark('convert shapes to bookmark')
					app.deleteShapes(deleteList)
					app.createShapes(createList)
				},
			},
			{
				id: 'convert-to-embed',
				label: 'action.convert-to-embed',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('convert-to-embed', { source })
					const ids = app.selectedIds
					const shapes = compact(ids.map((id) => app.getShapeById(id)))

					const createList: TLShapePartial[] = []
					const deleteList: TLShapeId[] = []
					for (const shape of shapes) {
						if (!TLBookmarkShapeDef.is(shape)) continue

						const { url } = shape.props

						const embedInfo = getEmbedInfo(shape.props.url)

						if (!embedInfo) continue
						if (!embedInfo.definition) continue

						const { width, height, doesResize } = embedInfo.definition

						const newPos = new Vec2d(shape.x, shape.y)
						newPos.rot(-shape.rotation)
						newPos.add(new Vec2d(shape.props.w / 2 - width / 2, shape.props.h / 2 - height / 2))
						newPos.rot(shape.rotation)

						createList.push({
							id: app.createShapeId(),
							type: 'embed',
							x: newPos.x,
							y: newPos.y,
							rotation: shape.rotation,
							props: {
								url: url,
								w: width,
								h: height,
								doesResize,
							},
						})
						deleteList.push(shape.id)
					}

					app.mark('convert shapes to embed')
					app.deleteShapes(deleteList)
					app.createShapes(createList)
				},
			},
			{
				id: 'duplicate',
				kbd: '$d',
				label: 'action.duplicate',
				icon: 'duplicate',
				readonlyOk: false,
				onSelect(source) {
					if (app.currentToolId !== 'select') return
					trackEvent('duplicate-shapes', { source })
					const ids = app.selectedIds
					const commonBounds = Box2d.Common(compact(ids.map((id) => app.getPageBoundsById(id))))
					const offset = app.canMoveCamera
						? {
								x: commonBounds.width + 10,
								y: 0,
						  }
						: {
								x: 16 / app.zoomLevel,
								y: 16 / app.zoomLevel,
						  }
					app.mark('duplicate shapes')
					app.duplicateShapes(ids, offset)
				},
			},
			{
				id: 'ungroup',
				label: 'action.ungroup',
				kbd: '$!g',
				icon: 'ungroup',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('ungroup-shapes', { source })
					app.mark('ungroup')
					app.ungroupShapes(app.selectedIds)
				},
			},
			{
				id: 'group',
				label: 'action.group',
				kbd: '$g',
				icon: 'group',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('group-shapes', { source })
					if (app.selectedShapes.length === 1 && app.selectedShapes[0].type === 'group') {
						app.mark('ungroup')
						app.ungroupShapes(app.selectedIds)
					} else {
						app.mark('group')
						app.groupShapes(app.selectedIds)
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
					trackEvent('align-shapes', { operation: 'left', source })
					app.mark('align left')
					app.alignShapes('left', app.selectedIds)
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
					trackEvent('align-shapes', { operation: 'center-horizontal', source })
					app.mark('align center horizontal')
					app.alignShapes('center-horizontal', app.selectedIds)
				},
			},
			{
				id: 'align-right',
				label: 'action.align-right',
				kbd: '?D',
				icon: 'align-right',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('align-shapes', { operation: 'right', source })
					app.mark('align right')
					app.alignShapes('right', app.selectedIds)
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
					trackEvent('align-shapes', { operation: 'center-vertical', source })
					app.mark('align center vertical')
					app.alignShapes('center-vertical', app.selectedIds)
				},
			},
			{
				id: 'align-top',
				label: 'action.align-top',
				icon: 'align-top',
				kbd: '?W',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('align-shapes', { operation: 'top', source })
					app.mark('align top')
					app.alignShapes('top', app.selectedIds)
				},
			},
			{
				id: 'align-bottom',
				label: 'action.align-bottom',
				icon: 'align-bottom',
				kbd: '?S',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('align-shapes', { operation: 'bottom', source })
					app.mark('align bottom')
					app.alignShapes('bottom', app.selectedIds)
				},
			},
			{
				id: 'distribute-horizontal',
				label: 'action.distribute-horizontal',
				contextMenuLabel: 'action.distribute-horizontal.short',
				icon: 'distribute-horizontal',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('distribute-shapes', { operation: 'horizontal', source })
					app.mark('distribute horizontal')
					app.distributeShapes('horizontal', app.selectedIds)
				},
			},
			{
				id: 'distribute-vertical',
				label: 'action.distribute-vertical',
				contextMenuLabel: 'action.distribute-vertical.short',
				icon: 'distribute-vertical',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('distribute-shapes', { operation: 'vertical', source })
					app.mark('distribute vertical')
					app.distributeShapes('vertical', app.selectedIds)
				},
			},
			{
				id: 'stretch-horizontal',
				label: 'action.stretch-horizontal',
				contextMenuLabel: 'action.stretch-horizontal.short',
				icon: 'stretch-horizontal',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('stretch-shapes', { operation: 'horizontal', source })
					app.mark('stretch horizontal')
					app.stretchShapes('horizontal', app.selectedIds)
				},
			},
			{
				id: 'stretch-vertical',
				label: 'action.stretch-vertical',
				contextMenuLabel: 'action.stretch-vertical.short',
				icon: 'stretch-vertical',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('stretch-shapes', { operation: 'vertical', source })
					app.mark('stretch vertical')
					app.stretchShapes('vertical', app.selectedIds)
				},
			},
			{
				id: 'flip-horizontal',
				label: 'action.flip-horizontal',
				contextMenuLabel: 'action.flip-horizontal.short',
				kbd: '!h',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('flip-shapes', { operation: 'horizontal', source })
					app.mark('flip horizontal')
					app.flipShapes('horizontal', app.selectedIds)
				},
			},
			{
				id: 'flip-vertical',
				label: 'action.flip-vertical',
				contextMenuLabel: 'action.flip-vertical.short',
				kbd: '!v',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('flip-shapes', { operation: 'vertical', source })
					app.mark('flip vertical')
					app.flipShapes('vertical', app.selectedIds)
				},
			},
			{
				id: 'pack',
				label: 'action.pack',
				icon: 'pack',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('pack-shapes', { source })
					app.mark('pack')
					app.packShapes(app.selectedIds)
				},
			},
			{
				id: 'stack-vertical',
				label: 'action.stack-vertical',
				contextMenuLabel: 'action.stack-vertical.short',
				icon: 'stack-vertical',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('stack-shapes', { operation: 'vertical', source })
					app.mark('stack-vertical')
					app.stackShapes('vertical', app.selectedIds)
				},
			},
			{
				id: 'stack-horizontal',
				label: 'action.stack-horizontal',
				contextMenuLabel: 'action.stack-horizontal.short',
				icon: 'stack-horizontal',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('stack-shapes', { operation: 'horizontal', source })
					app.mark('stack-horizontal')
					app.stackShapes('horizontal', app.selectedIds)
				},
			},
			{
				id: 'bring-to-front',
				label: 'action.bring-to-front',
				kbd: ']',
				icon: 'bring-to-front',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('reorder-shapes', { operation: 'toFront', source })
					app.mark('bring to front')
					app.bringToFront()
				},
			},
			{
				id: 'bring-forward',
				label: 'action.bring-forward',
				icon: 'bring-forward',
				kbd: '?]',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('reorder-shapes', { operation: 'forward', source })
					app.mark('bring forward')
					app.bringForward()
				},
			},
			{
				id: 'send-backward',
				label: 'action.send-backward',
				icon: 'send-backward',
				kbd: '?[',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('reorder-shapes', { operation: 'backward', source })
					app.mark('send backward')
					app.sendBackward()
				},
			},
			{
				id: 'send-to-back',
				label: 'action.send-to-back',
				icon: 'send-to-back',
				kbd: '[',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('reorder-shapes', { operation: 'toBack', source })
					app.mark('send to back')
					app.sendToBack()
				},
			},
			{
				id: 'cut',
				label: 'action.cut',
				kbd: '$x',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('cut', { source })
					app.mark('cut')
					cut()
				},
			},
			{
				id: 'copy',
				label: 'action.copy',
				kbd: '$c',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('copy', { source })
					copy()
				},
			},
			{
				id: 'paste',
				label: 'action.paste',
				kbd: '$v',
				readonlyOk: false,
				onSelect() {
					// must be inlined with a custom menu item
					// the kbd listed here should have no effect
				},
			},
			{
				id: 'select-all',
				label: 'action.select-all',
				kbd: '$a',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('select-all-shapes', { source })
					if (app.currentToolId !== 'select') {
						app.cancel()
						app.setSelectedTool('select')
					}

					app.mark('select all kbd')
					app.selectAll()
				},
			},
			{
				id: 'select-none',
				label: 'action.select-none',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('select-none-shapes', { source })
					app.mark('select none')
					app.selectNone()
				},
			},
			{
				id: 'delete',
				label: 'action.delete',
				kbd: '⌫',
				icon: 'trash',
				readonlyOk: false,
				onSelect(source) {
					if (app.currentToolId !== 'select') return
					trackEvent('delete-shapes', { source })
					app.mark('delete')
					app.deleteShapes()
				},
			},
			{
				id: 'rotate-cw',
				label: 'action.rotate-cw',
				icon: 'rotate-cw',
				readonlyOk: false,
				onSelect(source) {
					if (app.selectedIds.length === 0) return
					trackEvent('rotate-cw', { source })
					app.mark('rotate-cw')
					const offset = app.selectionRotation % (TAU / 2)
					const dontUseOffset = approximately(offset, 0) || approximately(offset, TAU / 2)
					app.rotateShapesBy(app.selectedIds, TAU / 2 - (dontUseOffset ? 0 : offset))
				},
			},
			{
				id: 'rotate-ccw',
				label: 'action.rotate-ccw',
				icon: 'rotate-ccw',
				readonlyOk: false,
				onSelect(source) {
					if (app.selectedIds.length === 0) return
					trackEvent('rotate-ccw', { source })
					app.mark('rotate-ccw')
					const offset = app.selectionRotation % (TAU / 2)
					const offsetCloseToZero = approximately(offset, 0)
					app.rotateShapesBy(app.selectedIds, offsetCloseToZero ? -(TAU / 2) : -offset)
				},
			},
			{
				id: 'zoom-in',
				label: 'action.zoom-in',
				kbd: '$=',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-in', { source })
					app.zoomIn(app.viewportScreenCenter, { duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'zoom-out',
				label: 'action.zoom-out',
				kbd: '$-',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-out', { source })
					app.zoomOut(app.viewportScreenCenter, { duration: ANIMATION_MEDIUM_MS })
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
					app.resetZoom(app.viewportScreenCenter, { duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'zoom-to-fit',
				label: 'action.zoom-to-fit',
				kbd: '!1',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-to-fit', { source })
					app.zoomToFit({ duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'zoom-to-selection',
				label: 'action.zoom-to-selection',
				kbd: '!2',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-to-selection', { source })
					app.zoomToSelection({ duration: ANIMATION_MEDIUM_MS })
				},
			},
			{
				id: 'toggle-snap-mode',
				label: 'action.toggle-snap-mode',
				menuLabel: 'action.toggle-snap-mode.menu',
				readonlyOk: false,
				onSelect(source) {
					trackEvent('toggle-snap-mode', { source })
					app.setSnapMode(!app.isSnapMode)
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
					app.setDarkMode(!app.isDarkMode)
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
					app.updateInstanceState(
						{
							exportBackground: !app.instanceState.exportBackground,
						},
						true
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
					app.setToolLocked(!app.isToolLocked)
				},
				checkbox: true,
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
						app.batch(() => {
							trackEvent('toggle-focus-mode', { source })
							clearDialogs()
							clearToasts()
							app.setFocusMode(!app.isFocusMode)
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
					app.setGridMode(!app.isGridMode)
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
					app.updateInstanceState(
						{
							isDebugMode: !app.instanceState.isDebugMode,
						},
						true
					)
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
					app.setPenMode(false)
				},
			},
			{
				id: 'stop-following',
				label: 'action.stop-following',
				icon: 'cross-2',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('stop-following', { source })
					app.stopFollowingUser()
				},
			},
			{
				id: 'back-to-content',
				label: 'action.back-to-content',
				icon: 'arrow-left',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-to-content', { source })
					app.zoomToContent()
				},
			},
		])

		if (overrides) {
			return overrides(app, actions, undefined)
		}

		return actions
	}, [
		trackEvent,
		overrides,
		app,
		addDialog,
		insertMedia,
		exportAs,
		copyAs,
		cut,
		copy,
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

function asActions<T extends Record<string, ActionItem>>(actions: T) {
	return actions as Record<keyof typeof actions, ActionItem>
}
