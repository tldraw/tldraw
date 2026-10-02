import {
	defineMessages,
	Box,
	DefaultColorStyle,
	DefaultFillStyle,
	Editor,
	GeoShapeGeoStyle,
	HALF_PI,
	PageRecordType,
	Result,
	StyleProp,
	TLEmbedShape,
	TLImageShape,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	TLVideoShape,
	Vec,
	approximately,
	compact,
	createShapeId,
	fetch,
	kickoutOccludedShapes,
	openWindow,
	useMaybeEditor,
} from '@tldraw/editor'
import * as React from 'react'
import { defaultHandleExternalTextContent } from '../../defaultExternalContentHandlers'
import { createBookmarkFromUrl } from '../../shapes/bookmark/bookmarks'
import { downloadFile } from '../../utils/export/exportAs'
import { fitFrameToContent, getFrameableShapeIds, removeFrame } from '../../utils/frames/frames'
import { generateShapeAnnouncementMessage } from '../components/A11y'
import { EditLinkDialog } from '../components/EditLinkDialog'
import { EmbedDialog } from '../components/EmbedDialog'
import { useShowCollaborationUi } from '../hooks/useCollaborationStatus'
import { flattenShapesToImages } from '../hooks/useFlatten'
import { TLUiTranslationKey } from '../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../icon-types'
import { TLUiOverrideHelpers, useDefaultHelpers } from '../overrides'
import { useA11y } from './a11y'
import { useTldrawUiComponents } from './components'
import { TLUiEventSource, useUiEvents } from './events'

// The action labels, declared so they reach the catalog. An action's `label` is data the menu
// components translate, not an element, so these can't be `<F>`; referencing the descriptor's id
// keeps the string extractable and the prop a plain key, which is what an app overriding one
// passes.
const messages = defineMessages({
	a11yAdjustShapeStyles: { id: 'a11y.adjust-shape-styles', defaultMessage: 'Adjust shape styles' },
	a11yEnlargeShape: { id: 'a11y.enlarge-shape', defaultMessage: 'Enlarge shape' },
	a11yRepeatShape: { id: 'a11y.repeat-shape', defaultMessage: 'Repeat shape' },
	a11yShrinkShape: { id: 'a11y.shrink-shape', defaultMessage: 'Shrink shape' },
	actionAlignBottom: { id: 'action.align-bottom', defaultMessage: 'Align bottom' },
	actionAlignCenterHorizontal: {
		id: 'action.align-center-horizontal',
		defaultMessage: 'Align horizontally',
	},
	actionAlignCenterHorizontalShort: {
		id: 'action.align-center-horizontal.short',
		defaultMessage: 'Align H',
	},
	actionAlignCenterVertical: {
		id: 'action.align-center-vertical',
		defaultMessage: 'Align vertically',
	},
	actionAlignCenterVerticalShort: {
		id: 'action.align-center-vertical.short',
		defaultMessage: 'Align V',
	},
	actionAlignLeft: { id: 'action.align-left', defaultMessage: 'Align left' },
	actionAlignRight: { id: 'action.align-right', defaultMessage: 'Align right' },
	actionAlignTop: { id: 'action.align-top', defaultMessage: 'Align top' },
	actionBackToContent: { id: 'action.back-to-content', defaultMessage: 'Back to content' },
	actionBringForward: { id: 'action.bring-forward', defaultMessage: 'Bring forward' },
	actionBringToFront: { id: 'action.bring-to-front', defaultMessage: 'Bring to front' },
	actionConvertToBookmark: {
		id: 'action.convert-to-bookmark',
		defaultMessage: 'Convert to bookmark',
	},
	actionConvertToEmbed: { id: 'action.convert-to-embed', defaultMessage: 'Convert to embed' },
	actionCopy: { id: 'action.copy', defaultMessage: 'Copy' },
	actionCopyAsJson: { id: 'action.copy-as-json', defaultMessage: 'Copy as JSON' },
	actionCopyAsJsonShort: { id: 'action.copy-as-json.short', defaultMessage: 'JSON' },
	actionCopyAsPng: { id: 'action.copy-as-png', defaultMessage: 'Copy as PNG' },
	actionCopyAsPngShort: { id: 'action.copy-as-png.short', defaultMessage: 'PNG' },
	actionCopyAsSvg: { id: 'action.copy-as-svg', defaultMessage: 'Copy as SVG' },
	actionCopyAsSvgShort: { id: 'action.copy-as-svg.short', defaultMessage: 'SVG' },
	actionCopyHoveredStyles: {
		id: 'action.copy-hovered-styles',
		defaultMessage: 'Copy hovered styles',
	},
	actionCut: { id: 'action.cut', defaultMessage: 'Cut' },
	actionDelete: { id: 'action.delete', defaultMessage: 'Delete' },
	actionDistributeHorizontal: {
		id: 'action.distribute-horizontal',
		defaultMessage: 'Distribute horizontally',
	},
	actionDistributeHorizontalShort: {
		id: 'action.distribute-horizontal.short',
		defaultMessage: 'Distribute H',
	},
	actionDistributeVertical: {
		id: 'action.distribute-vertical',
		defaultMessage: 'Distribute vertically',
	},
	actionDistributeVerticalShort: {
		id: 'action.distribute-vertical.short',
		defaultMessage: 'Distribute V',
	},
	actionDownloadOriginal: { id: 'action.download-original', defaultMessage: 'Download original' },
	actionDuplicate: { id: 'action.duplicate', defaultMessage: 'Duplicate' },
	actionEditLink: { id: 'action.edit-link', defaultMessage: 'Edit link…' },
	actionEnhancedA11yMode: {
		id: 'action.enhanced-a11y-mode',
		defaultMessage: 'Toggle enhanced accessibility mode',
	},
	actionEnhancedA11yModeMenu: {
		id: 'action.enhanced-a11y-mode.menu',
		defaultMessage: 'Enhanced accessibility mode',
	},
	actionExitPenMode: { id: 'action.exit-pen-mode', defaultMessage: 'Exit pen mode' },
	actionExportAllAsPng: { id: 'action.export-all-as-png', defaultMessage: 'Export as PNG' },
	actionExportAllAsPngShort: { id: 'action.export-all-as-png.short', defaultMessage: 'PNG' },
	actionExportAllAsSvg: { id: 'action.export-all-as-svg', defaultMessage: 'Export as SVG' },
	actionExportAllAsSvgShort: { id: 'action.export-all-as-svg.short', defaultMessage: 'SVG' },
	actionExportAsPng: { id: 'action.export-as-png', defaultMessage: 'Export as PNG' },
	actionExportAsPngShort: { id: 'action.export-as-png.short', defaultMessage: 'PNG' },
	actionExportAsSvg: { id: 'action.export-as-svg', defaultMessage: 'Export as SVG' },
	actionExportAsSvgShort: { id: 'action.export-as-svg.short', defaultMessage: 'SVG' },
	actionFitFrameToContent: { id: 'action.fit-frame-to-content', defaultMessage: 'Fit to content' },
	actionFlattenToImage: { id: 'action.flatten-to-image', defaultMessage: 'Flatten' },
	actionFlipHorizontal: { id: 'action.flip-horizontal', defaultMessage: 'Flip horizontally' },
	actionFlipHorizontalShort: { id: 'action.flip-horizontal.short', defaultMessage: 'Flip H' },
	actionFlipVertical: { id: 'action.flip-vertical', defaultMessage: 'Flip vertically' },
	actionFlipVerticalShort: { id: 'action.flip-vertical.short', defaultMessage: 'Flip V' },
	actionFrameSelection: { id: 'action.frame-selection', defaultMessage: 'Frame selection' },
	actionGroup: { id: 'action.group', defaultMessage: 'Group' },
	actionInsertEmbed: { id: 'action.insert-embed', defaultMessage: 'Insert embed…' },
	actionInsertMedia: { id: 'action.insert-media', defaultMessage: 'Upload media…' },
	actionOpenCursorChat: { id: 'action.open-cursor-chat', defaultMessage: 'Cursor chat' },
	actionOpenEmbedLink: { id: 'action.open-embed-link', defaultMessage: 'Open link' },
	actionOpenKbdShortcuts: { id: 'action.open-kbd-shortcuts', defaultMessage: 'Keyboard shortcuts' },
	actionPack: { id: 'action.pack', defaultMessage: 'Pack' },
	actionPaste: { id: 'action.paste', defaultMessage: 'Paste' },
	actionPasteErrorDescription: {
		id: 'action.paste-error-description',
		defaultMessage:
			'Could not paste due to missing clipboard permissions. Please enable the permissions and try again.',
	},
	actionPasteErrorTitle: { id: 'action.paste-error-title', defaultMessage: 'Pasting failed' },
	actionPrint: { id: 'action.print', defaultMessage: 'Print…' },
	actionRedo: { id: 'action.redo', defaultMessage: 'Redo' },
	actionRemoveFrame: { id: 'action.remove-frame', defaultMessage: 'Remove frame' },
	actionRotateCcw: { id: 'action.rotate-ccw', defaultMessage: 'Rotate counterclockwise' },
	actionRotateCw: { id: 'action.rotate-cw', defaultMessage: 'Rotate clockwise' },
	actionSelectAll: { id: 'action.select-all', defaultMessage: 'Select all' },
	actionSelectNone: { id: 'action.select-none', defaultMessage: 'Select none' },
	actionSelectZoomTool: { id: 'action.select-zoom-tool', defaultMessage: 'Zoom' },
	actionSendBackward: { id: 'action.send-backward', defaultMessage: 'Send backward' },
	actionSendToBack: { id: 'action.send-to-back', defaultMessage: 'Send to back' },
	actionStackHorizontal: { id: 'action.stack-horizontal', defaultMessage: 'Stack horizontally' },
	actionStackHorizontalShort: { id: 'action.stack-horizontal.short', defaultMessage: 'Stack H' },
	actionStackVertical: { id: 'action.stack-vertical', defaultMessage: 'Stack vertically' },
	actionStackVerticalShort: { id: 'action.stack-vertical.short', defaultMessage: 'Stack V' },
	actionStopFollowing: { id: 'action.stop-following', defaultMessage: 'Stop following' },
	actionStretchHorizontal: {
		id: 'action.stretch-horizontal',
		defaultMessage: 'Stretch horizontally',
	},
	actionStretchHorizontalShort: {
		id: 'action.stretch-horizontal.short',
		defaultMessage: 'Stretch H',
	},
	actionStretchVertical: { id: 'action.stretch-vertical', defaultMessage: 'Stretch vertically' },
	actionStretchVerticalShort: { id: 'action.stretch-vertical.short', defaultMessage: 'Stretch V' },
	actionToggleAutoSize: { id: 'action.toggle-auto-size', defaultMessage: 'Toggle auto size' },
	actionToggleDarkMode: { id: 'action.toggle-dark-mode', defaultMessage: 'Toggle dark mode' },
	actionToggleDarkModeMenu: { id: 'action.toggle-dark-mode.menu', defaultMessage: 'Dark mode' },
	actionToggleDebugMode: { id: 'action.toggle-debug-mode', defaultMessage: 'Toggle debug mode' },
	actionToggleDebugModeMenu: { id: 'action.toggle-debug-mode.menu', defaultMessage: 'Debug mode' },
	actionToggleDynamicSizeMode: {
		id: 'action.toggle-dynamic-size-mode',
		defaultMessage: 'Toggle dynamic size',
	},
	actionToggleDynamicSizeModeMenu: {
		id: 'action.toggle-dynamic-size-mode.menu',
		defaultMessage: 'Dynamic size',
	},
	actionToggleEdgeScrolling: {
		id: 'action.toggle-edge-scrolling',
		defaultMessage: 'Toggle edge scrolling',
	},
	actionToggleEdgeScrollingMenu: {
		id: 'action.toggle-edge-scrolling.menu',
		defaultMessage: 'Edge scrolling',
	},
	actionToggleFocusMode: { id: 'action.toggle-focus-mode', defaultMessage: 'Toggle focus mode' },
	actionToggleFocusModeMenu: { id: 'action.toggle-focus-mode.menu', defaultMessage: 'Focus mode' },
	actionToggleGrid: { id: 'action.toggle-grid', defaultMessage: 'Toggle grid' },
	actionToggleGridMenu: { id: 'action.toggle-grid.menu', defaultMessage: 'Show grid' },
	actionToggleInvertZoom: {
		id: 'action.toggle-invert-zoom',
		defaultMessage: 'Toggle invert mouse zoom',
	},
	actionToggleInvertZoomMenu: {
		id: 'action.toggle-invert-zoom.menu',
		defaultMessage: 'Invert mouse zoom',
	},
	actionToggleKeyboardShortcuts: {
		id: 'action.toggle-keyboard-shortcuts',
		defaultMessage: 'Toggle keyboard shortcuts',
	},
	actionToggleKeyboardShortcutsMenu: {
		id: 'action.toggle-keyboard-shortcuts.menu',
		defaultMessage: 'Enable keyboard shortcuts',
	},
	actionToggleLock: { id: 'action.toggle-lock', defaultMessage: 'Toggle locked' },
	actionTogglePasteAtCursor: {
		id: 'action.toggle-paste-at-cursor',
		defaultMessage: 'Toggle paste at cursor',
	},
	actionTogglePasteAtCursorMenu: {
		id: 'action.toggle-paste-at-cursor.menu',
		defaultMessage: 'Paste at cursor',
	},
	actionToggleReduceMotion: {
		id: 'action.toggle-reduce-motion',
		defaultMessage: 'Toggle reduce motion',
	},
	actionToggleReduceMotionMenu: {
		id: 'action.toggle-reduce-motion.menu',
		defaultMessage: 'Reduce motion',
	},
	actionToggleSnapMode: { id: 'action.toggle-snap-mode', defaultMessage: 'Toggle always snap' },
	actionToggleSnapModeMenu: { id: 'action.toggle-snap-mode.menu', defaultMessage: 'Always snap' },
	actionToggleToolLock: { id: 'action.toggle-tool-lock', defaultMessage: 'Toggle tool lock' },
	actionToggleToolLockMenu: { id: 'action.toggle-tool-lock.menu', defaultMessage: 'Tool lock' },
	actionToggleTransparent: {
		id: 'action.toggle-transparent',
		defaultMessage: 'Toggle transparent background',
	},
	actionToggleTransparentContextMenu: {
		id: 'action.toggle-transparent.context-menu',
		defaultMessage: 'Transparent',
	},
	actionToggleTransparentMenu: {
		id: 'action.toggle-transparent.menu',
		defaultMessage: 'Transparent',
	},
	actionToggleWrapMode: { id: 'action.toggle-wrap-mode', defaultMessage: 'Toggle select on wrap' },
	actionToggleWrapModeMenu: {
		id: 'action.toggle-wrap-mode.menu',
		defaultMessage: 'Select on wrap',
	},
	actionUndo: { id: 'action.undo', defaultMessage: 'Undo' },
	actionUngroup: { id: 'action.ungroup', defaultMessage: 'Ungroup' },
	actionUnlockAll: { id: 'action.unlock-all', defaultMessage: 'Unlock all' },
	actionZoomIn: { id: 'action.zoom-in', defaultMessage: 'Zoom in' },
	actionZoomOut: { id: 'action.zoom-out', defaultMessage: 'Zoom out' },
	actionZoomTo100: { id: 'action.zoom-to-100', defaultMessage: 'Zoom to 100%' },
	actionZoomToFit: { id: 'action.zoom-to-fit', defaultMessage: 'Zoom to fit' },
	actionZoomToSelection: { id: 'action.zoom-to-selection', defaultMessage: 'Zoom to selection' },
	colorStyleWhite: { id: 'color-style.white', defaultMessage: 'White' },
	contextPagesNewPage: { id: 'context.pages.new-page', defaultMessage: 'New page' },
	documentDefaultName: { id: 'document.default-name', defaultMessage: 'Untitled' },
	fillStyleFill: { id: 'fill-style.fill', defaultMessage: 'Fill' },
	fillStyleLinedFill: { id: 'fill-style.lined-fill', defaultMessage: 'Lined fill' },
	pageMenuNewPageInitialName: { id: 'page-menu.new-page-initial-name', defaultMessage: 'Page 1' },
	toolReplaceMedia: { id: 'tool.replace-media', defaultMessage: 'Replace media…' },
})

/** @public */
export interface TLUiActionItem<
	TransationKey extends string = string,
	IconType extends string = string,
> {
	icon?: IconType | React.ReactElement
	id: string
	kbd?: string
	label?: TransationKey | { [key: string]: TransationKey }
	readonlyOk?: boolean
	checkbox?: boolean
	isRequiredA11yAction?: boolean
	onSelect(source: TLUiEventSource): Promise<void> | void
}

/** @public */
export type TLUiActionsContextType = Record<string, TLUiActionItem>

/** @internal */
export const ActionsContext = React.createContext<TLUiActionsContextType | null>(null)

/**
 * The page point the context menu opened at, or null while it is closed. The context menu
 * writes it; actions that place content (paste) read it, since the pointer keeps moving
 * over the menu after it opens (#10423).
 *
 * @internal
 */
export const ContextMenuPagePointContext = React.createContext<{ current: Vec | null } | null>(null)

/** @public */
export interface ActionsProviderProps {
	overrides?(
		editor: Editor,
		actions: TLUiActionsContextType,
		helpers: TLUiOverrideHelpers
	): TLUiActionsContextType
	children: React.ReactNode
}

/** @public */
export function supportsDownloadingOriginal(
	shape: TLShape,
	editor: Editor
): shape is TLImageShape | TLVideoShape {
	return (
		(editor.isShapeOfType(shape, 'image') || editor.isShapeOfType(shape, 'video')) &&
		!!(shape as any).props.assetId
	)
}

function makeActions(actions: TLUiActionItem[]) {
	return Object.fromEntries(actions.map((action) => [action.id, action])) as TLUiActionsContextType
}

function getExportName(editor: Editor, defaultName: string) {
	// When we don't have any shapes selected, we want to use the document name
	if (editor.getSelectedShapeIds().length === 0) {
		return editor.getDocumentSettings().name || defaultName
	}
	return undefined
}

function getSelectedOrAllShapeIds(editor: Editor) {
	const ids = editor.getSelectedShapeIds()
	return ids.length > 0 ? ids : Array.from(editor.getCurrentPageShapeIds())
}

/** @internal */
export function ActionsProvider({ overrides, children }: ActionsProviderProps) {
	const _editor = useMaybeEditor()
	const showCollaborationUi = useShowCollaborationUi()
	const helpers = useDefaultHelpers()
	const components = useTldrawUiComponents()
	const trackEvent = useUiEvents()
	const a11y = useA11y()
	const msg = useTranslation()

	const defaultDocumentName = helpers.msg(messages.documentDefaultName.id)

	const rContextMenuPagePoint = React.useRef<Vec | null>(null)

	// should this be a useMemo? looks like it doesn't actually deref any reactive values
	const actions = React.useMemo<TLUiActionsContextType>(() => {
		const editor = _editor as Editor
		if (!editor) return {}
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

		function scaleShapes(scaleFactor: number) {
			if (!canApplySelectionAction()) return
			if (mustGoBackToSelectToolFirst()) return

			editor.markHistoryStoppingPoint('resize shapes')

			editor.run(() => {
				const scaleOrigin = editor.getSelectionPageBounds()?.center
				// Re-reading the bounds after each resize would make the selection center drift.
				for (const id of editor.getSelectedShapeIds()) {
					editor.resizeShape(id, new Vec(scaleFactor, scaleFactor), { scaleOrigin })
				}
			})
		}

		function updateSelectedShapes(markName: string, update: (ids: TLShapeId[]) => void) {
			editor.markHistoryStoppingPoint(markName)
			editor.run(() => {
				const selectedShapeIds = editor.getSelectedShapeIds()
				update(selectedShapeIds)
				kickoutOccludedShapes(editor, selectedShapeIds)
			})
		}

		function setStyleShortcut<T extends string | number>(
			style: StyleProp<T>,
			value: T,
			markName: string,
			source: TLUiEventSource
		) {
			editor.run(() => {
				editor.updateInstanceState({ isChangingStyle: true })
				editor.markHistoryStoppingPoint(markName)
				if (editor.isIn('select')) {
					editor.setStyleForSelectedShapes(style, value)
				}
				editor.setStyleForNextShapes(style, value)
			})
			trackEvent('set-style', { source, id: style.id, value })
		}

		function readClipboard<T>(read: () => Promise<T> | undefined, onRead: (result: T) => void) {
			read()
				?.then(onRead)
				.catch(() => {
					helpers.addToast({
						title: helpers.msg(messages.actionPasteErrorTitle.id),
						description: helpers.msg(messages.actionPasteErrorDescription.id),
						severity: 'error',
					})
				})
		}

		const actionItems: TLUiActionItem<TLUiTranslationKey, TLUiIconType>[] = [
			{
				id: 'edit-link',
				label: messages.actionEditLink.id,
				icon: 'link',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('edit-link', { source })
					editor.markHistoryStoppingPoint('edit-link')
					helpers.addDialog({ component: EditLinkDialog })
				},
			},
			{
				id: 'insert-embed',
				label: messages.actionInsertEmbed.id,
				kbd: 'cmd+i,ctrl+i',
				onSelect(source) {
					trackEvent('insert-embed', { source })
					helpers.addDialog({ component: EmbedDialog })
				},
			},
			{
				id: 'open-kbd-shortcuts',
				label: messages.actionOpenKbdShortcuts.id,
				kbd: 'cmd+alt+/,ctrl+alt+/',
				onSelect(source) {
					const { KeyboardShortcutsDialog } = components
					if (!KeyboardShortcutsDialog) return
					trackEvent('open-kbd-shortcuts', { source })
					helpers.addDialog({ component: KeyboardShortcutsDialog })
				},
			},
			{
				id: 'insert-media',
				label: messages.actionInsertMedia.id,
				kbd: 'cmd+u,ctrl+u',
				onSelect(source) {
					trackEvent('insert-media', { source })
					helpers.insertMedia()
				},
			},
			{
				id: 'undo',
				label: messages.actionUndo.id,
				icon: 'undo',
				kbd: 'cmd+z,ctrl+z',
				onSelect(source) {
					trackEvent('undo', { source })
					editor.undo()
				},
			},
			{
				id: 'redo',
				label: messages.actionRedo.id,
				icon: 'redo',
				kbd: 'cmd+shift+z,ctrl+shift+z',
				onSelect(source) {
					trackEvent('redo', { source })
					editor.redo()
				},
			},
			{
				id: 'export-as-svg',
				label: {
					default: messages.actionExportAsSvg.id,
					menu: messages.actionExportAsSvgShort.id,
					['context-menu']: messages.actionExportAsSvgShort.id,
				},
				readonlyOk: true,
				onSelect(source) {
					const ids = getSelectedOrAllShapeIds(editor)
					if (ids.length === 0) return
					trackEvent('export-as', { format: 'svg', source })
					helpers.exportAs(ids, { format: 'svg', name: getExportName(editor, defaultDocumentName) })
				},
			},
			{
				id: 'export-as-png',
				label: {
					default: messages.actionExportAsPng.id,
					menu: messages.actionExportAsPngShort.id,
					['context-menu']: messages.actionExportAsPngShort.id,
				},
				readonlyOk: true,
				onSelect(source) {
					const ids = getSelectedOrAllShapeIds(editor)
					if (ids.length === 0) return
					trackEvent('export-as', { format: 'png', source })
					helpers.exportAs(ids, { format: 'png', name: getExportName(editor, defaultDocumentName) })
				},
			},
			{
				id: 'export-all-as-svg',
				label: {
					default: messages.actionExportAllAsSvg.id,
					menu: messages.actionExportAllAsSvgShort.id,
					['context-menu']: messages.actionExportAllAsSvgShort.id,
				},
				readonlyOk: true,
				onSelect(source) {
					const ids = Array.from(editor.getCurrentPageShapeIds())
					if (ids.length === 0) return
					trackEvent('export-all-as', { format: 'svg', source })
					helpers.exportAs(ids, { format: 'svg', name: getExportName(editor, defaultDocumentName) })
				},
			},
			{
				id: 'export-all-as-png',
				label: {
					default: messages.actionExportAllAsPng.id,
					menu: messages.actionExportAllAsPngShort.id,
					['context-menu']: messages.actionExportAllAsPngShort.id,
				},
				readonlyOk: true,
				onSelect(source) {
					const ids = Array.from(editor.getCurrentPageShapeIds())
					if (ids.length === 0) return
					trackEvent('export-all-as', { format: 'png', source })
					helpers.exportAs(ids, { format: 'png', name: getExportName(editor, defaultDocumentName) })
				},
			},
			{
				id: 'copy-as-svg',
				label: {
					default: messages.actionCopyAsSvg.id,
					menu: messages.actionCopyAsSvgShort.id,
					['context-menu']: messages.actionCopyAsSvgShort.id,
				},
				readonlyOk: true,
				onSelect(source) {
					const ids = getSelectedOrAllShapeIds(editor)
					if (ids.length === 0) return
					trackEvent('copy-as', { format: 'svg', source })
					helpers.copyAs(ids, 'svg')
				},
			},
			{
				id: 'copy-as-png',
				label: {
					default: messages.actionCopyAsPng.id,
					menu: messages.actionCopyAsPngShort.id,
					['context-menu']: messages.actionCopyAsPngShort.id,
				},
				readonlyOk: true,
				kbd: 'cmd+shift+c,ctrl+shift+c',
				onSelect(source) {
					const ids = getSelectedOrAllShapeIds(editor)
					if (ids.length === 0) return
					trackEvent('copy-as', { format: 'png', source })
					helpers.copyAs(ids, 'png')
				},
			},
			{
				id: 'copy-as-json',
				label: {
					default: messages.actionCopyAsJson.id,
					menu: messages.actionCopyAsJsonShort.id,
					['context-menu']: messages.actionCopyAsJsonShort.id,
				},
				readonlyOk: true,
				onSelect(source) {
					const ids = getSelectedOrAllShapeIds(editor)
					if (ids.length === 0) return
					trackEvent('copy-as', { format: 'json', source })
					helpers.copyAs(ids, 'json')
				},
			},
			{
				id: 'toggle-auto-size',
				label: messages.actionToggleAutoSize.id,
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('toggle-auto-size', { source })
					editor.markHistoryStoppingPoint('toggling auto size')
					editor.run(() => {
						const shapes = editor
							.getSelectedShapes()
							.filter(
								(shape): shape is TLTextShape =>
									editor.isShapeOfType(shape, 'text') && shape.props.autoSize === false
							)
						editor.updateShapes(
							shapes.map((shape) => {
								return { id: shape.id, type: shape.type, props: { w: 8, autoSize: true } }
							})
						)
						kickoutOccludedShapes(
							editor,
							shapes.map((shape) => shape.id)
						)
					})
				},
			},
			{
				id: 'open-embed-link',
				label: messages.actionOpenEmbedLink.id,
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
					if (!shape || !editor.isShapeOfType(shape, 'embed')) {
						console.error(warnMsg)
						return
					}

					openWindow(shape.props.url, '_blank')
				},
			},
			{
				id: 'select-zoom-tool',
				label: messages.actionSelectZoomTool.id,
				readonlyOk: true,
				kbd: 'z, !z',
				onSelect(source) {
					// Noop if user is actually cmd/ctrl+z'ing
					if (editor.inputs.getAccelKey()) return

					// Noop unless in the current tool's idle state
					const path = editor.getPath()
					if (!path.endsWith('.idle')) return

					// Noop if already in zoom tool
					if (editor.root.getCurrent()?.id === 'zoom') return

					trackEvent('zoom-tool', { source })
					// The editor ignores keys while a button holds focus, so zoom would never see the
					// Z key up that exits it. editor.focus() won't help: the button is already inside
					// the container, so the editor reads as focused.
					editor.getContainer().focus()
					editor.setCurrentTool('zoom', { onInteractionEnd: path })
				},
			},
			{
				id: 'convert-to-bookmark',
				label: messages.actionConvertToBookmark.id,
				async onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('convert-to-bookmark', { source })
					const shapes = editor.getSelectedShapes()

					const markId = editor.markHistoryStoppingPoint('convert shapes to bookmark')

					const creationPromises: Promise<Result<any, any>>[] = []

					for (const shape of shapes) {
						if (!shape || !editor.isShapeOfType(shape, 'embed') || !shape.props.url) continue

						const center = editor.getShapePageBounds(shape)?.center

						if (!center) continue
						editor.deleteShapes([shape.id])

						creationPromises.push(
							createBookmarkFromUrl(editor, { url: shape.props.url, center }).then((res) => {
								if (!res.ok) {
									throw new Error(res.error)
								}
								return res
							})
						)
					}

					await Promise.all(creationPromises).catch((error) => {
						editor.bailToMark(markId)
						console.error(error)
					})
				},
			},
			{
				id: 'convert-to-embed',
				label: messages.actionConvertToEmbed.id,
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('convert-to-embed', { source })

					editor.run(() => {
						const createList: TLShapePartial[] = []
						const deleteList: TLShapeId[] = []
						for (const shape of editor.getSelectedShapes()) {
							if (!editor.isShapeOfType(shape, 'bookmark')) continue

							const { url } = shape.props

							const embedInfo = helpers.getEmbedDefinition(url)
							if (!embedInfo?.definition) continue

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
			},
			{
				id: 'duplicate',
				kbd: 'cmd+d,ctrl+d',
				label: messages.actionDuplicate.id,
				icon: 'duplicate',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

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
			},
			{
				id: 'ungroup',
				label: messages.actionUngroup.id,
				kbd: 'cmd+shift+g,ctrl+shift+g',
				icon: 'ungroup',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('ungroup-shapes', { source })
					editor.markHistoryStoppingPoint('ungroup')
					editor.ungroupShapes(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'group',
				label: messages.actionGroup.id,
				kbd: 'cmd+g,ctrl+g',
				icon: 'group',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('group-shapes', { source })
					const onlySelectedShape = editor.getOnlySelectedShape()
					if (onlySelectedShape && editor.isShapeOfType(onlySelectedShape, 'group')) {
						editor.markHistoryStoppingPoint('ungroup')
						editor.ungroupShapes(editor.getSelectedShapeIds())
					} else {
						editor.markHistoryStoppingPoint('group')
						editor.groupShapes(editor.getSelectedShapeIds())
					}
				},
			},
			{
				id: 'frame-selection',
				label: messages.actionFrameSelection.id,
				kbd: 'cmd+alt+g,ctrl+alt+g',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					const selectedShapes = editor.getSelectedShapes()

					// If all selected shapes are frames, remove them (toggle behavior)
					if (
						selectedShapes.length > 0 &&
						selectedShapes.every((shape) => editor.isShapeOfType(shape, 'frame'))
					) {
						trackEvent('remove-frame', { source })
						editor.markHistoryStoppingPoint('remove-frame')
						removeFrame(
							editor,
							selectedShapes.map((shape) => shape.id)
						)
						return
					}

					// Unlike group, a single shape can be framed, so there is no two-shape minimum.
					const ids = getFrameableShapeIds(editor, editor.getSelectedShapeIds())
					if (ids.length === 0) return

					const shapes = compact(ids.map((id) => editor.getShape(id)))
					const pageBounds = editor.getShapesPageBounds(ids)
					if (!pageBounds) return
					// Frame props reject zero dimensions, which a lone horizontal arrow or a dot has. The
					// frame is fitted to its content with padding below, so a placeholder size is fine here.
					const { w, h } = Box.ZeroFix(pageBounds)

					trackEvent('frame-selection', { source })
					editor.markHistoryStoppingPoint('frame-selection')

					const parentId = editor.findCommonAncestor(shapes) ?? editor.getCurrentPageId()

					const frameId = createShapeId()
					const padding = 25 / editor.getZoomLevel()

					editor.run(() => {
						editor.createShapes([
							{
								id: frameId,
								type: 'frame',
								parentId,
								x: pageBounds.x,
								y: pageBounds.y,
								props: { w, h },
							},
						])
						editor.reparentShapes(ids, frameId)
						fitFrameToContent(editor, frameId, { padding })
						editor.select(frameId)
					})
				},
			},
			{
				id: 'remove-frame',
				label: messages.actionRemoveFrame.id,
				onSelect(source) {
					if (!canApplySelectionAction()) return

					trackEvent('remove-frame', { source })
					const selectedShapes = editor.getSelectedShapes()
					if (
						selectedShapes.length > 0 &&
						selectedShapes.every((shape) => editor.isShapeFrameLike(shape))
					) {
						editor.markHistoryStoppingPoint('remove-frame')
						removeFrame(
							editor,
							selectedShapes.map((shape) => shape.id)
						)
					}
				},
			},
			{
				id: 'fit-frame-to-content',
				label: messages.actionFitFrameToContent.id,
				onSelect(source) {
					if (!canApplySelectionAction()) return

					trackEvent('fit-frame-to-content', { source })
					const onlySelectedShape = editor.getOnlySelectedShape()
					if (onlySelectedShape && editor.isShapeFrameLike(onlySelectedShape)) {
						editor.markHistoryStoppingPoint('fit-frame-to-content')
						fitFrameToContent(editor, onlySelectedShape.id)
					}
				},
			},
			{
				id: 'align-left',
				label: messages.actionAlignLeft.id,
				kbd: 'alt+A',
				icon: 'align-left',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'left', source })
					updateSelectedShapes('align left', (ids) => editor.alignShapes(ids, 'left'))
				},
			},
			{
				id: 'align-center-horizontal',
				label: {
					default: messages.actionAlignCenterHorizontal.id,
					['context-menu']: messages.actionAlignCenterHorizontalShort.id,
				},
				kbd: 'alt+H',
				icon: 'align-center-horizontal',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'center-horizontal', source })
					updateSelectedShapes('align center horizontal', (ids) =>
						editor.alignShapes(ids, 'center-horizontal')
					)
				},
			},
			{
				id: 'align-right',
				label: messages.actionAlignRight.id,
				kbd: 'alt+D',
				icon: 'align-right',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'right', source })
					updateSelectedShapes('align right', (ids) => editor.alignShapes(ids, 'right'))
				},
			},
			{
				id: 'align-center-vertical',
				label: {
					default: messages.actionAlignCenterVertical.id,
					['context-menu']: messages.actionAlignCenterVerticalShort.id,
				},
				kbd: 'alt+V',
				icon: 'align-center-vertical',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'center-vertical', source })
					updateSelectedShapes('align center vertical', (ids) =>
						editor.alignShapes(ids, 'center-vertical')
					)
				},
			},
			{
				id: 'align-top',
				label: messages.actionAlignTop.id,
				icon: 'align-top',
				kbd: 'alt+W',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'top', source })
					updateSelectedShapes('align top', (ids) => editor.alignShapes(ids, 'top'))
				},
			},
			{
				id: 'align-bottom',
				label: messages.actionAlignBottom.id,
				icon: 'align-bottom',
				kbd: 'alt+S',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('align-shapes', { operation: 'bottom', source })
					updateSelectedShapes('align bottom', (ids) => editor.alignShapes(ids, 'bottom'))
				},
			},
			{
				id: 'distribute-horizontal',
				label: {
					default: messages.actionDistributeHorizontal.id,
					['context-menu']: messages.actionDistributeHorizontalShort.id,
				},
				icon: 'distribute-horizontal',
				kbd: 'alt+shift+h',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('distribute-shapes', { operation: 'horizontal', source })
					updateSelectedShapes('distribute horizontal', (ids) =>
						editor.distributeShapes(ids, 'horizontal')
					)
				},
			},
			{
				id: 'distribute-vertical',
				label: {
					default: messages.actionDistributeVertical.id,
					['context-menu']: messages.actionDistributeVerticalShort.id,
				},
				icon: 'distribute-vertical',
				kbd: 'alt+shift+V',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('distribute-shapes', { operation: 'vertical', source })
					updateSelectedShapes('distribute vertical', (ids) =>
						editor.distributeShapes(ids, 'vertical')
					)
				},
			},
			{
				id: 'stretch-horizontal',
				label: {
					default: messages.actionStretchHorizontal.id,
					['context-menu']: messages.actionStretchHorizontalShort.id,
				},
				icon: 'stretch-horizontal',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stretch-shapes', { operation: 'horizontal', source })
					updateSelectedShapes('stretch horizontal', (ids) =>
						editor.stretchShapes(ids, 'horizontal')
					)
				},
			},
			{
				id: 'stretch-vertical',
				label: {
					default: messages.actionStretchVertical.id,
					['context-menu']: messages.actionStretchVerticalShort.id,
				},
				icon: 'stretch-vertical',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stretch-shapes', { operation: 'vertical', source })
					updateSelectedShapes('stretch vertical', (ids) => editor.stretchShapes(ids, 'vertical'))
				},
			},
			{
				id: 'flip-horizontal',
				label: {
					default: messages.actionFlipHorizontal.id,
					['context-menu']: messages.actionFlipHorizontalShort.id,
				},
				kbd: 'shift+h',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('flip-shapes', { operation: 'horizontal', source })
					updateSelectedShapes('flip horizontal', (ids) => editor.flipShapes(ids, 'horizontal'))
				},
			},
			{
				id: 'flip-vertical',
				label: {
					default: messages.actionFlipVertical.id,
					['context-menu']: messages.actionFlipVerticalShort.id,
				},
				kbd: 'shift+v',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('flip-shapes', { operation: 'vertical', source })
					updateSelectedShapes('flip vertical', (ids) => editor.flipShapes(ids, 'vertical'))
				},
			},
			{
				id: 'pack',
				label: messages.actionPack.id,
				icon: 'pack',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('pack-shapes', { source })
					updateSelectedShapes('pack', (ids) =>
						editor.packShapes(ids, editor.options.adjacentShapeMargin)
					)
				},
			},
			{
				id: 'stack-vertical',
				label: {
					default: messages.actionStackVertical.id,
					['context-menu']: messages.actionStackVerticalShort.id,
				},
				icon: 'stack-vertical',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stack-shapes', { operation: 'vertical', source })
					updateSelectedShapes('stack-vertical', (ids) =>
						editor.stackShapes(ids, 'vertical', editor.options.adjacentShapeMargin)
					)
				},
			},
			{
				id: 'stack-horizontal',
				label: {
					default: messages.actionStackHorizontal.id,
					['context-menu']: messages.actionStackHorizontalShort.id,
				},
				icon: 'stack-horizontal',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('stack-shapes', { operation: 'horizontal', source })
					updateSelectedShapes('stack-horizontal', (ids) =>
						editor.stackShapes(ids, 'horizontal', editor.options.adjacentShapeMargin)
					)
				},
			},
			{
				id: 'bring-to-front',
				label: messages.actionBringToFront.id,
				kbd: ']',
				icon: 'bring-to-front',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'toFront', source })
					editor.markHistoryStoppingPoint('bring to front')
					editor.bringToFront(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'bring-forward',
				label: messages.actionBringForward.id,
				icon: 'bring-forward',
				kbd: 'alt+]',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'forward', source })
					editor.markHistoryStoppingPoint('bring forward')
					editor.bringForward(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'send-backward',
				label: messages.actionSendBackward.id,
				icon: 'send-backward',
				kbd: 'alt+[',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'backward', source })
					editor.markHistoryStoppingPoint('send backward')
					editor.sendBackward(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'send-to-back',
				label: messages.actionSendToBack.id,
				icon: 'send-to-back',
				kbd: '[',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('reorder-shapes', { operation: 'toBack', source })
					editor.markHistoryStoppingPoint('send to back')
					editor.sendToBack(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'cut',
				label: messages.actionCut.id,
				kbd: 'cmd+x,ctrl+x',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					helpers.cut(source)
				},
			},
			{
				id: 'copy',
				label: messages.actionCopy.id,
				kbd: 'cmd+c,ctrl+c',
				readonlyOk: true,
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					helpers.copy(source)
				},
			},
			{
				id: 'paste',
				label: messages.actionPaste.id,
				kbd: 'cmd+v,ctrl+v',
				onSelect(source) {
					// Resolve the point before the clipboard read: the menu closes, and clears
					// its point, before the read settles.
					const point =
						source === 'context-menu'
							? (rContextMenuPagePoint.current ?? editor.inputs.getCurrentPagePoint())
							: undefined
					readClipboard(
						() => navigator.clipboard?.read(),
						(clipboardItems) => helpers.paste(clipboardItems, source, point)
					)
				},
			},
			{
				// Cmd+Option+V: paste at cursor (or center if paste-at-cursor pref is on)
				id: 'paste-at-cursor',
				label: messages.actionPaste.id,
				kbd: '$?v',
				onSelect(source) {
					const pasteAtCursor = !editor.user.getIsPasteAtCursorMode()
					const point = pasteAtCursor ? editor.inputs.getCurrentPagePoint() : undefined
					readClipboard(
						() => navigator.clipboard?.read(),
						(clipboardItems) => helpers.paste(clipboardItems, source, point)
					)
				},
			},
			{
				// Cmd+Shift+Option+V: paste plain text at cursor (or center if pref is on)
				id: 'paste-plain-text-at-cursor',
				label: messages.actionPaste.id,
				kbd: '$!?v',
				onSelect() {
					const pasteAtCursor = !editor.user.getIsPasteAtCursorMode()
					const point = pasteAtCursor
						? editor.inputs.getCurrentPagePoint()
						: editor.getViewportPageBounds().center
					readClipboard(
						() => navigator.clipboard?.readText(),
						(text) => {
							if (text?.trim()) {
								editor.markHistoryStoppingPoint('paste')
								defaultHandleExternalTextContent(editor, { text, point })
							}
						}
					)
				},
			},
			{
				id: 'select-all',
				label: messages.actionSelectAll.id,
				kbd: 'cmd+a,ctrl+a',
				readonlyOk: true,
				onSelect(source) {
					editor.run(() => {
						if (mustGoBackToSelectToolFirst()) return

						trackEvent('select-all-shapes', { source })

						editor.markHistoryStoppingPoint('select all kbd')
						editor.selectAll()
					})
				},
			},
			{
				id: 'select-none',
				label: messages.actionSelectNone.id,
				readonlyOk: true,
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('select-none-shapes', { source })
					editor.markHistoryStoppingPoint('select none')
					editor.selectNone()
				},
			},
			{
				id: 'delete',
				label: messages.actionDelete.id,
				kbd: '⌫,del',
				icon: 'trash',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('delete-shapes', { source })
					editor.markHistoryStoppingPoint('delete')
					editor.deleteShapes(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'rotate-cw',
				label: messages.actionRotateCw.id,
				icon: 'rotate-cw',
				kbd: 'shift+.,shift+alt+.',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					const isFine = editor.inputs.getAltKey()
					trackEvent('rotate-cw', { source, fine: isFine })
					updateSelectedShapes('rotate-cw', (ids) => {
						const rotation = HALF_PI / (isFine ? 96 : 6)
						const offset = editor.getSelectionRotation() % rotation
						const dontUseOffset = approximately(offset, 0) || approximately(offset, rotation)
						editor.rotateShapesBy(ids, rotation - (dontUseOffset ? 0 : offset))
					})
				},
			},
			{
				id: 'rotate-ccw',
				label: messages.actionRotateCcw.id,
				icon: 'rotate-ccw',
				// omg double comma
				kbd: 'shift+,,shift+alt+,',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					const isFine = editor.inputs.getAltKey()
					trackEvent('rotate-ccw', { source, fine: isFine })
					updateSelectedShapes('rotate-ccw', (ids) => {
						const rotation = HALF_PI / (isFine ? 96 : 6)
						const offset = editor.getSelectionRotation() % rotation
						const offsetCloseToZero = approximately(offset, 0)
						editor.rotateShapesBy(ids, offsetCloseToZero ? -rotation : -offset)
					})
				},
			},
			{
				id: 'zoom-in',
				label: messages.actionZoomIn.id,
				kbd: 'cmd+=,ctrl+=,=',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-in', { source, towardsCursor: false })
					editor.zoomIn(undefined, {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
			},
			{
				id: 'zoom-in-on-cursor',
				label: messages.actionZoomIn.id,
				kbd: 'shift+cmd+=,shift+ctrl+=,shift+=',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-in', { source, towardsCursor: true })
					editor.zoomIn(editor.inputs.getCurrentScreenPoint(), {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
			},
			{
				id: 'zoom-out',
				label: messages.actionZoomOut.id,
				kbd: 'cmd+-,ctrl+-,-',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-out', { source, towardsCursor: false })
					editor.zoomOut(undefined, {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
			},
			{
				id: 'zoom-out-on-cursor',
				label: messages.actionZoomOut.id,
				kbd: 'shift+cmd+-,shift+ctrl+-,shift+-',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-out', { source, towardsCursor: true })
					editor.zoomOut(editor.inputs.getCurrentScreenPoint(), {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
			},
			{
				id: 'zoom-to-100',
				label: messages.actionZoomTo100.id,
				icon: 'reset-zoom',
				kbd: 'shift+0',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('reset-zoom', { source })
					editor.resetZoom(undefined, {
						animation: { duration: editor.options.animationMediumMs },
					})
				},
			},
			{
				id: 'zoom-to-fit',
				label: messages.actionZoomToFit.id,
				kbd: 'shift+1',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-to-fit', { source })
					editor.zoomToFit({ animation: { duration: editor.options.animationMediumMs } })
				},
			},
			{
				id: 'zoom-to-selection',
				label: messages.actionZoomToSelection.id,
				kbd: 'shift+2',
				readonlyOk: true,
				onSelect(source) {
					if (!canApplySelectionAction()) return
					if (mustGoBackToSelectToolFirst()) return

					trackEvent('zoom-to-selection', { source })
					editor.zoomToSelection({ animation: { duration: editor.options.animationMediumMs } })
				},
			},
			{
				id: 'toggle-snap-mode',
				label: {
					default: messages.actionToggleSnapMode.id,
					menu: messages.actionToggleSnapModeMenu.id,
				},
				onSelect(source) {
					trackEvent('toggle-snap-mode', { source })
					editor.user.updateUserPreferences({ isSnapMode: !editor.user.getIsSnapMode() })
				},
				checkbox: true,
			},
			{
				id: 'toggle-dark-mode',
				label: {
					default: messages.actionToggleDarkMode.id,
					menu: messages.actionToggleDarkModeMenu.id,
				},
				kbd: 'cmd+/,ctrl+/',
				readonlyOk: true,
				onSelect(source) {
					const value = editor.user.getIsDarkMode() ? 'light' : 'dark'
					trackEvent('color-scheme', { source, value })
					editor.user.updateUserPreferences({
						colorScheme: value,
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-wrap-mode',
				label: {
					default: messages.actionToggleWrapMode.id,
					menu: messages.actionToggleWrapModeMenu.id,
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-wrap-mode', { source })
					editor.user.updateUserPreferences({
						isWrapMode: !editor.user.getIsWrapMode(),
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-dynamic-size-mode',
				label: {
					default: messages.actionToggleDynamicSizeMode.id,
					menu: messages.actionToggleDynamicSizeModeMenu.id,
				},
				readonlyOk: false,
				onSelect(source) {
					trackEvent('toggle-dynamic-size-mode', { source })
					editor.user.updateUserPreferences({
						isDynamicSizeMode: !editor.user.getIsDynamicResizeMode(),
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-paste-at-cursor',
				label: {
					default: messages.actionTogglePasteAtCursor.id,
					menu: messages.actionTogglePasteAtCursorMenu.id,
				},
				readonlyOk: false,
				onSelect(source) {
					trackEvent('toggle-paste-at-cursor', { source })
					editor.user.updateUserPreferences({
						isPasteAtCursorMode: !editor.user.getIsPasteAtCursorMode(),
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-reduce-motion',
				label: {
					default: messages.actionToggleReduceMotion.id,
					menu: messages.actionToggleReduceMotionMenu.id,
				},
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
				id: 'toggle-keyboard-shortcuts',
				label: {
					default: messages.actionToggleKeyboardShortcuts.id,
					menu: messages.actionToggleKeyboardShortcutsMenu.id,
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-keyboard-shortcuts', { source })
					editor.user.updateUserPreferences({
						areKeyboardShortcutsEnabled: !editor.user.getAreKeyboardShortcutsEnabled(),
					})
				},
				checkbox: true,
			},
			{
				id: 'enhanced-a11y-mode',
				label: {
					default: messages.actionEnhancedA11yMode.id,
					menu: messages.actionEnhancedA11yModeMenu.id,
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('enhanced-a11y-mode', { source })
					editor.user.updateUserPreferences({
						enhancedA11yMode: !editor.user.getEnhancedA11yMode(),
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-edge-scrolling',
				label: {
					default: messages.actionToggleEdgeScrolling.id,
					menu: messages.actionToggleEdgeScrollingMenu.id,
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-edge-scrolling', { source })
					editor.user.updateUserPreferences({
						edgeScrollSpeed: editor.user.getEdgeScrollSpeed() === 0 ? 1 : 0,
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-invert-zoom',
				label: {
					default: messages.actionToggleInvertZoom.id,
					menu: messages.actionToggleInvertZoomMenu.id,
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-invert-zoom', { source })
					editor.user.updateUserPreferences({
						isZoomDirectionInverted: !editor.user.getIsZoomDirectionInverted(),
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-transparent',
				label: {
					default: messages.actionToggleTransparent.id,
					menu: messages.actionToggleTransparentMenu.id,
					['context-menu']: messages.actionToggleTransparentContextMenu.id,
				},
				readonlyOk: true,
				onSelect(source) {
					trackEvent('toggle-transparent', { source })
					editor.updateInstanceState({
						exportBackground: !editor.getInstanceState().exportBackground,
					})
				},
				checkbox: true,
			},
			{
				id: 'toggle-tool-lock',
				label: {
					default: messages.actionToggleToolLock.id,
					menu: messages.actionToggleToolLockMenu.id,
				},
				kbd: 'q',
				onSelect(source) {
					trackEvent('toggle-tool-lock', { source })
					editor.updateInstanceState({ isToolLocked: !editor.getInstanceState().isToolLocked })
				},
				checkbox: true,
			},
			{
				id: 'unlock-all',
				label: messages.actionUnlockAll.id,
				onSelect(source) {
					trackEvent('unlock-all', { source })
					const updates = [] as TLShapePartial[]
					for (const shape of editor.getCurrentPageShapes()) {
						if (shape.isLocked) {
							updates.push({ id: shape.id, type: shape.type, isLocked: false })
						}
					}
					if (updates.length > 0) {
						editor.markHistoryStoppingPoint('unlock all')
						editor.updateShapes(updates)
					}
				},
			},
			{
				id: 'toggle-focus-mode',
				label: {
					default: messages.actionToggleFocusMode.id,
					menu: messages.actionToggleFocusModeMenu.id,
				},
				readonlyOk: true,
				kbd: 'cmd+.,ctrl+.',
				checkbox: true,
				onSelect(source) {
					// this needs to be deferred because it causes the menu
					// UI to unmount which puts us in a dodgy state
					editor.timers.requestAnimationFrame(() => {
						editor.run(() => {
							trackEvent('toggle-focus-mode', { source })
							helpers.clearDialogs()
							helpers.clearToasts()
							editor.updateInstanceState({ isFocusMode: !editor.getInstanceState().isFocusMode })
						})
					})
				},
			},
			{
				id: 'toggle-grid',
				label: {
					default: messages.actionToggleGrid.id,
					menu: messages.actionToggleGridMenu.id,
				},
				readonlyOk: true,
				kbd: "cmd+',ctrl+'",
				onSelect(source) {
					trackEvent('toggle-grid-mode', { source })
					editor.updateInstanceState({ isGridMode: !editor.getInstanceState().isGridMode })
				},
				checkbox: true,
			},
			{
				id: 'toggle-debug-mode',
				label: {
					default: messages.actionToggleDebugMode.id,
					menu: messages.actionToggleDebugModeMenu.id,
				},
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
				label: messages.actionPrint.id,
				kbd: 'cmd+p,ctrl+p',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('print', { source })
					helpers.printSelectionOrPages()
				},
			},
			{
				id: 'exit-pen-mode',
				label: messages.actionExitPenMode.id,
				icon: 'cross-2',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('exit-pen-mode', { source })
					editor.updateInstanceState({ isPenMode: false })
				},
			},
			{
				id: 'stop-following',
				label: messages.actionStopFollowing.id,
				icon: 'cross-2',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('stop-following', { source })
					editor.stopFollowingUser()
				},
			},
			{
				id: 'back-to-content',
				label: messages.actionBackToContent.id,
				icon: 'arrow-left',
				readonlyOk: true,
				onSelect(source) {
					trackEvent('zoom-to-content', { source })
					const bounds = editor.getSelectionPageBounds() ?? editor.getCurrentPageBounds()
					if (!bounds) return
					editor.zoomToBounds(bounds, {
						targetZoom: Math.min(1, editor.getZoomLevel()),
						animation: { duration: 220 },
					})
				},
			},
			{
				id: 'toggle-lock',
				label: messages.actionToggleLock.id,
				kbd: 'shift+l',
				onSelect(source) {
					if (!canApplySelectionAction()) return
					editor.markHistoryStoppingPoint('locking')
					trackEvent('toggle-lock', { source })
					editor.toggleLock(editor.getSelectedShapeIds())
				},
			},
			{
				id: 'move-to-new-page',
				label: messages.contextPagesNewPage.id,
				onSelect(source) {
					const newPageId = PageRecordType.createId()
					const ids = editor.getSelectedShapeIds()
					editor.run(() => {
						editor.markHistoryStoppingPoint('move_shapes_to_page')
						editor.createPage({
							name: helpers.msg(messages.pageMenuNewPageInitialName.id),
							id: newPageId,
						})
						editor.moveShapesToPage(ids, newPageId)
					})
					trackEvent('move-to-new-page', { source })
				},
			},
			{
				id: 'select-white-color',
				label: messages.colorStyleWhite.id,
				kbd: 'alt+t',
				onSelect(source) {
					setStyleShortcut(DefaultColorStyle, 'white', 'change-color', source)
				},
			},
			{
				id: 'select-fill-fill',
				label: messages.fillStyleFill.id,
				kbd: 'alt+f',
				onSelect(source) {
					setStyleShortcut(DefaultFillStyle, 'fill', 'change-fill', source)
				},
			},
			{
				id: 'select-fill-lined-fill',
				label: messages.fillStyleLinedFill.id,
				kbd: 'alt+shift+f',
				onSelect(source) {
					setStyleShortcut(DefaultFillStyle, 'lined-fill', 'change-fill', source)
				},
			},
			{
				id: 'flatten-to-image',
				label: messages.actionFlattenToImage.id,
				kbd: 'shift+f',
				onSelect: async (source) => {
					const ids = editor.getSelectedShapeIds()
					if (ids.length === 0) return

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
			},
			{
				id: 'select-geo-tool',
				kbd: 'g',
				onSelect: async (source) => {
					// will select whatever the most recent geo tool was
					trackEvent('select-tool', { source, id: `geo-previous` })
					editor.setCurrentTool('geo')
				},
			},
			{
				id: 'change-page-prev',
				kbd: 'alt+left,alt+up',
				readonlyOk: true,
				onSelect: async (source) => {
					// will select whatever the most recent geo tool was
					const pages = editor.getPages()
					const currentPageIndex = pages.findIndex((page) => page.id === editor.getCurrentPageId())
					if (currentPageIndex < 1) return
					trackEvent('change-page', { source, direction: 'prev' })
					editor.markHistoryStoppingPoint('change-page')
					editor.setCurrentPage(pages[currentPageIndex - 1].id)
				},
			},
			{
				id: 'change-page-next',
				kbd: 'alt+right,alt+down',
				readonlyOk: true,
				onSelect: async (source) => {
					// will select whatever the most recent geo tool was
					const pages = editor.getPages()
					const currentPageIndex = pages.findIndex((page) => page.id === editor.getCurrentPageId())

					// If we're on the last page...
					if (currentPageIndex === -1 || currentPageIndex >= pages.length - 1) {
						// if the current page is blank or if we're in readonly mode, do nothing
						if (editor.getCurrentPageShapes().length <= 0 || editor.getIsReadonly()) {
							return
						}
						// Otherwise, create a new page
						trackEvent('new-page', { source })
						editor.run(() => {
							editor.markHistoryStoppingPoint('creating page')
							const newPageId = PageRecordType.createId()
							editor.createPage({
								name: helpers.msg(messages.pageMenuNewPageInitialName.id),
								id: newPageId,
							})
							editor.setCurrentPage(newPageId)
						})
						return
					}

					editor.markHistoryStoppingPoint('change-page')
					editor.setCurrentPage(pages[currentPageIndex + 1].id)
					trackEvent('change-page', { source, direction: 'next' })
				},
			},
			{
				id: 'adjust-shape-styles',
				label: messages.a11yAdjustShapeStyles.id,
				kbd: 'cmd+Enter,ctrl+Enter',
				isRequiredA11yAction: true,
				onSelect: async (source) => {
					if (!canApplySelectionAction()) return

					const onlySelectedShape = editor.getOnlySelectedShape()
					if (
						onlySelectedShape &&
						(editor.isShapeOfType(onlySelectedShape, 'image') ||
							editor.isShapeOfType(onlySelectedShape, 'video'))
					) {
						const firstToolbarButton = editor
							.getContainer()
							.querySelector('.tlui-contextual-toolbar button:first-child') as HTMLElement | null
						firstToolbarButton?.focus()
						return
					}

					const firstButton = editor
						.getContainer()
						.querySelector('.tlui-style-panel button') as HTMLElement | null
					firstButton?.focus()
					trackEvent('adjust-shape-styles', { source })
				},
			},
			{
				id: 'a11y-open-context-menu',
				kbd: 'cmd+shift+Enter,ctrl+shift+Enter',
				isRequiredA11yAction: true,
				readonlyOk: true,
				onSelect: async (source) => {
					if (!canApplySelectionAction()) return

					// For multiple shapes or a single shape, get the selection bounds
					const selectionBounds = editor.getSelectionPageBounds()
					if (!selectionBounds) return

					// Convert page coordinates to screen coordinates
					const screenPoint = editor.pageToScreen(selectionBounds.center)

					// Dispatch a contextmenu event directly at the center of the selection
					editor
						.getContainer()
						.querySelector('.tl-canvas')
						?.dispatchEvent(
							new PointerEvent('contextmenu', {
								clientX: screenPoint.x,
								clientY: screenPoint.y,
								bubbles: true,
							})
						)

					trackEvent('open-context-menu', { source })
				},
			},
			{
				id: 'enlarge-shapes',
				label: messages.a11yEnlargeShape.id,
				kbd: 'cmd+alt+shift+=,ctrl+alt+shift+=',
				onSelect: async (source) => {
					if (!canApplySelectionAction()) return
					scaleShapes(1.1)
					trackEvent('enlarge-shapes', { source })
				},
			},
			{
				id: 'shrink-shapes',
				label: messages.a11yShrinkShape.id,
				kbd: 'cmd+alt+shift+-,ctrl+alt+shift+-',
				onSelect: async (source) => {
					if (!canApplySelectionAction()) return
					scaleShapes(1 / 1.1)
					trackEvent('shrink-shapes', { source })
				},
			},
			{
				id: 'a11y-repeat-shape-announce',
				kbd: 'alt+r',
				label: messages.a11yRepeatShape.id,
				isRequiredA11yAction: true,
				readonlyOk: true,
				onSelect: async (source) => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (!selectedShapeIds.length) return
					const a11yLive = generateShapeAnnouncementMessage({
						editor,
						selectedShapeIds,
						msg,
					})

					if (a11yLive) {
						a11y.announce({ msg: '' })
						editor.timers.requestAnimationFrame(() => {
							a11y.announce({ msg: a11yLive })
						})
						trackEvent('a11y-repeat-shape-announce', { source })
					}
				},
			},
			{
				id: 'image-replace',
				label: messages.toolReplaceMedia.id,
				icon: 'arrow-cycle',
				readonlyOk: false,
				onSelect: async (source) => {
					trackEvent('image-replace', { source })
					helpers.replaceImage()
				},
			},
			{
				id: 'video-replace',
				label: messages.toolReplaceMedia.id,
				icon: 'arrow-cycle',
				readonlyOk: false,
				onSelect: async (source) => {
					trackEvent('video-replace', { source })
					helpers.replaceVideo()
				},
			},
			{
				id: 'download-original',
				label: messages.actionDownloadOriginal.id,
				readonlyOk: true,
				onSelect: async (source) => {
					const selectedShapes = editor.getSelectedShapes()
					if (selectedShapes.length === 0) return

					const mediaShapes = selectedShapes.filter((s): s is TLImageShape | TLVideoShape =>
						supportsDownloadingOriginal(s, editor)
					)

					if (mediaShapes.length === 0) return

					for (const mediaShape of mediaShapes) {
						const asset = editor.getAsset(mediaShape.props.assetId!)
						if (!asset || !asset.props.src) continue

						const url = await editor.resolveAssetUrl(asset.id, { shouldResolveToOriginal: true })
						if (!url) continue

						const name =
							(asset.type === 'video' || asset.type === 'image') &&
							!asset.props.src.startsWith('asset:')
								? asset.props.name
								: 'download'

						try {
							const resp = await fetch(url)
							if (!resp.ok) throw new Error(`Failed to fetch asset: ${resp.status}`)
							const blob = await resp.blob()
							downloadFile(
								new File([blob], name, { type: blob.type }),
								editor.getContainerDocument()
							)
						} catch {
							// Fallback: open in new tab (e.g. if CORS blocked)
							openWindow(url, '_blank')
						}
					}

					trackEvent('download-original', { source })
				},
			},
			{
				id: 'copy-hovered-styles',
				label: messages.actionCopyHoveredStyles.id,
				kbd: 'shift+q',
				async onSelect(source) {
					const shape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
						hitInside: false,
						hitLabels: false,
						hitLocked: editor.options.selectLockedShapes,
						margin: editor.getHitTestMargin(),
					})

					const path = editor.getPath()
					if (!shape || !path.endsWith('.idle')) return

					// Setting styles for the next shape is instance state, not document state, so it
					// isn't undoable and doesn't need a history stopping point.
					editor.run(() => {
						for (const style of editor.styleProps[shape.type].keys()) {
							const value = editor.getShapeStyleIfExists(shape, style)
							if (value === undefined || style === GeoShapeGeoStyle) continue
							editor.setStyleForNextShapes(style, value)
						}
					})

					trackEvent('copy-hovered-styles', { source })
				},
			},
		]

		if (showCollaborationUi) {
			actionItems.push({
				id: 'open-cursor-chat',
				label: messages.actionOpenCursorChat.id,
				readonlyOk: true,
				kbd: '/',
				onSelect(source) {
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
			})
		}

		const actions = makeActions(actionItems)

		if (overrides) {
			return overrides(editor, actions, helpers)
		}

		return actions
	}, [
		helpers,
		_editor,
		trackEvent,
		overrides,
		defaultDocumentName,
		showCollaborationUi,
		msg,
		a11y,
		components,
	])

	return (
		<ContextMenuPagePointContext.Provider value={rContextMenuPagePoint}>
			<ActionsContext.Provider value={asActions(actions)}>{children}</ActionsContext.Provider>
		</ContextMenuPagePointContext.Provider>
	)
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
				? (label[menuType] ?? label['default'])
				: undefined
		: undefined
}
