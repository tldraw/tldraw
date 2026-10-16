import {
	HALF_PI,
	approximately,
	type Editor,
	type TLPageId,
	type TLShape,
	type TLShapeId,
	type TLShapePartial,
} from '@tldraw/editor'
import { GeoShapeGeoStyle, PageRecordType } from '@tldraw/tlschema'
import { defaultHandleExternalTextContent, startEditingShapeWithRichText } from 'tldraw'
import type { AppContext } from '../app/context'
import { getShapePlaintext } from '../editor/richText'
import { exportTextFile, loadTldrFile, saveTldrFile, watchDocumentChanges } from '../file/tldrFile'
import { canvasCenterCell } from '../input/pointer'
import { STYLE_PANEL_MIN_COLS } from '../ui/stylePanel'
import type { ModifierName } from '../ui/UiState'
import type { ActionId, ActionInvocation } from './actionIds'

const FLIPPABLE_TYPES: ReadonlySet<string> = new Set([
	'group',
	'image',
	'arrow',
	'line',
	'draw',
	'geo',
])

const SAVE_PROMPT = 'Save as: '
const OPEN_PROMPT = 'Open: '
const EXPORT_PROMPT = 'Export as text: '
const RENAME_PAGE_PROMPT = 'Rename page: '
const UNSAVED_PROMPT = 'Unsaved changes — save? (y/n/esc)'

/**
 * Runs an action from a shortcut, menu, toolbar or popup. Errors (including rejected file I/O)
 * surface in the status bar; the caller never waits.
 */
export function runAction(ctx: AppContext, invocation: ActionInvocation): void {
	performAction(ctx, invocation).catch((error: unknown) => reportError(ctx, error))
}

/** `runAction` with the asynchronous part exposed, for tests and sequenced flows. */
export async function performAction(ctx: AppContext, invocation: ActionInvocation): Promise<void> {
	try {
		await execute(ctx, invocation)
	} catch (error) {
		reportError(ctx, error)
	}
}

function reportError(ctx: AppContext, error: unknown): void {
	const message = error instanceof Error ? error.message : String(error)
	ctx.ui.showError(message, ctx.now())
}

// ---------------------------------------------------------------------------------------------
// Predicates, mirroring packages/tldraw/src/lib/ui/context/action-predicates.ts
// ---------------------------------------------------------------------------------------------

function canApplySelectionAction(editor: Editor): boolean {
	return editor.isIn('select') && editor.getSelectedShapeIds().length > 0
}

function getUnlockedSelectedShapes(editor: Editor): TLShape[] {
	return editor.getSelectedShapes().filter((s) => !editor.isShapeOrAncestorLocked(s))
}

function hasUnlockedSelection(editor: Editor, min: number): boolean {
	return getUnlockedSelectedShapes(editor).length >= min
}

function canApplyToUnlockedSelection(editor: Editor, min: number): boolean {
	return editor.isIn('select') && hasUnlockedSelection(editor, min)
}

function hasShapesOnPage(editor: Editor): boolean {
	return editor.getCurrentPageShapeIds().size > 0
}

function hasLockedShapesOnPage(editor: Editor): boolean {
	return editor.getCurrentPageShapes().some((s) => s.isLocked)
}

function isUngroupAllowed(editor: Editor): boolean {
	return getUnlockedSelectedShapes(editor).some((s) => editor.isShapeOfType(s, 'group'))
}

function isOnlyFlippableShapeSelected(editor: Editor): boolean {
	const shape = editor.getOnlySelectedShape()
	return !!shape && FLIPPABLE_TYPES.has(shape.type) && !editor.isShapeOrAncestorLocked(shape)
}

function editableTextShape(editor: Editor): TLShape | null {
	const shape = editor.getOnlySelectedShape()
	if (!shape || !editor.canEditShape(shape)) return null
	return getShapePlaintext(editor, shape) !== null ? shape : null
}

function currentPageIndex(editor: Editor): number {
	const id = editor.getCurrentPageId()
	return editor.getPages().findIndex((page) => page.id === id)
}

/** Whether an action would do something now; menus grey out the rest. */
export function isActionEnabled(ctx: AppContext, id: ActionId): boolean {
	const { editor } = ctx
	switch (id) {
		case 'edit.undo':
			return editor.getCanUndo()
		case 'edit.redo':
			return editor.getCanRedo()
		case 'edit.cut':
		case 'edit.delete':
		case 'edit.duplicate':
		case 'arrange.rotate-cw':
		case 'arrange.rotate-ccw':
		case 'arrange.bring-to-front':
		case 'arrange.bring-forward':
		case 'arrange.send-backward':
		case 'arrange.send-to-back':
			return canApplyToUnlockedSelection(editor, 1)
		case 'edit.copy':
		case 'edit.select-none':
		case 'edit.toggle-lock':
		case 'view.zoom-to-selection':
			return canApplySelectionAction(editor)
		case 'edit.paste':
			return ctx.clipboard.content !== null || ctx.clipboard.text !== null
		case 'edit.select-all':
		case 'view.zoom-to-fit':
			return hasShapesOnPage(editor)
		case 'edit.group':
			return canApplyToUnlockedSelection(editor, 2)
		case 'edit.ungroup':
			return editor.isIn('select') && isUngroupAllowed(editor)
		case 'edit.toggle-group':
			return (
				canApplyToUnlockedSelection(editor, 2) ||
				(editor.isIn('select') && isUngroupAllowed(editor))
			)
		case 'edit.unlock-all':
			return hasLockedShapesOnPage(editor)
		case 'edit.edit-text':
			return editableTextShape(editor) !== null
		case 'arrange.align-left':
		case 'arrange.align-center-horizontal':
		case 'arrange.align-right':
		case 'arrange.align-top':
		case 'arrange.align-center-vertical':
		case 'arrange.align-bottom':
		case 'arrange.stretch-horizontal':
		case 'arrange.stretch-vertical':
		case 'arrange.pack':
			return canApplyToUnlockedSelection(editor, 2)
		case 'arrange.distribute-horizontal':
		case 'arrange.distribute-vertical':
		case 'arrange.stack-horizontal':
		case 'arrange.stack-vertical':
			return canApplyToUnlockedSelection(editor, 3)
		case 'arrange.flip-horizontal':
		case 'arrange.flip-vertical':
			return (
				editor.isIn('select') &&
				(hasUnlockedSelection(editor, 2) || isOnlyFlippableShapeSelected(editor))
			)
		case 'view.zoom-to-100':
			return editor.getZoomLevel() !== 1
		case 'page.delete':
			return editor.getPages().length > 1
		case 'page.prev':
			return currentPageIndex(editor) > 0
		case 'page.next':
			return currentPageIndex(editor) < editor.getPages().length - 1
		default:
			return true
	}
}

// ---------------------------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------------------------

function execute(ctx: AppContext, invocation: ActionInvocation): void | Promise<void> {
	const { editor, ui } = ctx
	const { id, arg } = invocation
	switch (id) {
		// --- file ---
		case 'file.new':
			return confirmIfDirty(ctx, () => newDocument(ctx))
		case 'file.open':
			return confirmIfDirty(ctx, () => openDocument(ctx))
		case 'file.save':
			return saveDocument(ctx, false).then(() => undefined)
		case 'file.save-as':
			return saveDocument(ctx, true).then(() => undefined)
		case 'file.export-text':
			return exportDocumentText(ctx)
		case 'app.quit':
			return confirmIfDirty(ctx, () => ctx.quit())

		// --- edit ---
		case 'edit.undo':
			editor.undo()
			return
		case 'edit.redo':
			editor.redo()
			return
		case 'edit.cut':
			if (!canApplyToUnlockedSelection(editor, 1)) return
			copySelection(ctx)
			editor.markHistoryStoppingPoint('cut')
			editor.deleteShapes(editor.getSelectedShapeIds())
			return
		case 'edit.copy':
			if (!canApplySelectionAction(editor)) return
			copySelection(ctx)
			return
		case 'edit.paste':
			paste(ctx)
			return
		case 'edit.duplicate':
			duplicate(editor)
			return
		case 'edit.delete':
			if (!canApplyToUnlockedSelection(editor, 1)) return
			editor.markHistoryStoppingPoint('delete')
			editor.deleteShapes(editor.getSelectedShapeIds())
			return
		case 'edit.select-all':
			editor.run(() => {
				if (!editor.isIn('select')) {
					editor.complete()
					editor.setCurrentTool('select')
				}
				editor.markHistoryStoppingPoint('select all kbd')
				editor.selectAll()
			})
			return
		case 'edit.select-none':
			if (!canApplySelectionAction(editor)) return
			editor.markHistoryStoppingPoint('select none')
			editor.selectNone()
			return
		case 'edit.group':
			if (!canApplyToUnlockedSelection(editor, 2)) return
			editor.markHistoryStoppingPoint('group')
			editor.groupShapes(editor.getSelectedShapeIds())
			return
		case 'edit.ungroup':
			if (!editor.isIn('select') || !isUngroupAllowed(editor)) return
			editor.markHistoryStoppingPoint('ungroup')
			editor.ungroupShapes(editor.getSelectedShapeIds())
			return
		case 'edit.toggle-group': {
			// Like tldraw's `group` action: ctrl+g on a single group ungroups (actions.tsx:638-657).
			if (!canApplySelectionAction(editor)) return
			const only = editor.getOnlySelectedShape()
			if (only && editor.isShapeOfType(only, 'group')) {
				editor.markHistoryStoppingPoint('ungroup')
				editor.ungroupShapes(editor.getSelectedShapeIds())
			} else if (hasUnlockedSelection(editor, 2)) {
				editor.markHistoryStoppingPoint('group')
				editor.groupShapes(editor.getSelectedShapeIds())
			}
			return
		}
		case 'edit.toggle-lock':
			if (!canApplySelectionAction(editor)) return
			editor.markHistoryStoppingPoint('locking')
			editor.toggleLock(editor.getSelectedShapeIds())
			return
		case 'edit.unlock-all': {
			const updates: TLShapePartial[] = []
			for (const shape of editor.getCurrentPageShapes()) {
				if (shape.isLocked) updates.push({ id: shape.id, type: shape.type, isLocked: false })
			}
			if (updates.length > 0) {
				editor.markHistoryStoppingPoint('unlock all')
				editor.updateShapes(updates)
			}
			return
		}
		case 'edit.edit-text':
			startEditingSelectedShape(editor)
			return

		// --- arrange ---
		case 'arrange.align-left':
			return arrange(editor, 2, 'align left', (ids) => editor.alignShapes(ids, 'left'))
		case 'arrange.align-center-horizontal':
			return arrange(editor, 2, 'align center horizontal', (ids) =>
				editor.alignShapes(ids, 'center-horizontal')
			)
		case 'arrange.align-right':
			return arrange(editor, 2, 'align right', (ids) => editor.alignShapes(ids, 'right'))
		case 'arrange.align-top':
			return arrange(editor, 2, 'align top', (ids) => editor.alignShapes(ids, 'top'))
		case 'arrange.align-center-vertical':
			return arrange(editor, 2, 'align center vertical', (ids) =>
				editor.alignShapes(ids, 'center-vertical')
			)
		case 'arrange.align-bottom':
			return arrange(editor, 2, 'align bottom', (ids) => editor.alignShapes(ids, 'bottom'))
		case 'arrange.distribute-horizontal':
			return arrange(editor, 3, 'distribute horizontal', (ids) =>
				editor.distributeShapes(ids, 'horizontal')
			)
		case 'arrange.distribute-vertical':
			return arrange(editor, 3, 'distribute vertical', (ids) =>
				editor.distributeShapes(ids, 'vertical')
			)
		case 'arrange.stretch-horizontal':
			return arrange(editor, 2, 'stretch horizontal', (ids) =>
				editor.stretchShapes(ids, 'horizontal')
			)
		case 'arrange.stretch-vertical':
			return arrange(editor, 2, 'stretch vertical', (ids) => editor.stretchShapes(ids, 'vertical'))
		case 'arrange.flip-horizontal':
			if (!hasUnlockedSelection(editor, 2) && !isOnlyFlippableShapeSelected(editor)) return
			return arrange(editor, 1, 'flip horizontal', (ids) => editor.flipShapes(ids, 'horizontal'))
		case 'arrange.flip-vertical':
			if (!hasUnlockedSelection(editor, 2) && !isOnlyFlippableShapeSelected(editor)) return
			return arrange(editor, 1, 'flip vertical', (ids) => editor.flipShapes(ids, 'vertical'))
		case 'arrange.rotate-cw':
			return rotateSelection(editor, 1)
		case 'arrange.rotate-ccw':
			return rotateSelection(editor, -1)
		case 'arrange.pack':
			return arrange(editor, 2, 'pack', (ids) =>
				editor.packShapes(ids, editor.options.adjacentShapeMargin)
			)
		case 'arrange.stack-horizontal':
			return arrange(editor, 3, 'stack-horizontal', (ids) =>
				editor.stackShapes(ids, 'horizontal', editor.options.adjacentShapeMargin)
			)
		case 'arrange.stack-vertical':
			return arrange(editor, 3, 'stack-vertical', (ids) =>
				editor.stackShapes(ids, 'vertical', editor.options.adjacentShapeMargin)
			)
		case 'arrange.bring-to-front':
			return reorder(editor, 'bring to front', (ids) => editor.bringToFront(ids))
		case 'arrange.bring-forward':
			return reorder(editor, 'bring forward', (ids) => editor.bringForward(ids))
		case 'arrange.send-backward':
			return reorder(editor, 'send backward', (ids) => editor.sendBackward(ids))
		case 'arrange.send-to-back':
			return reorder(editor, 'send to back', (ids) => editor.sendToBack(ids))

		// --- view ---
		case 'view.zoom-in':
			editor.zoomIn(undefined, { immediate: true })
			return
		case 'view.zoom-out':
			editor.zoomOut(undefined, { immediate: true })
			return
		case 'view.zoom-to-fit':
			if (!hasShapesOnPage(editor)) return
			editor.zoomToFit({ immediate: true })
			return
		case 'view.zoom-to-selection':
			if (!canApplySelectionAction(editor)) return
			editor.zoomToSelection({ immediate: true })
			return
		case 'view.zoom-to-100':
			editor.resetZoom(undefined, { immediate: true })
			return
		case 'view.toggle-grid':
			editor.updateInstanceState({ isGridMode: !editor.getInstanceState().isGridMode })
			return
		case 'view.toggle-snap':
			editor.user.updateUserPreferences({ isSnapMode: !editor.user.getIsSnapMode() })
			return
		case 'view.toggle-tool-lock':
			editor.updateInstanceState({ isToolLocked: !editor.getInstanceState().isToolLocked })
			return
		case 'view.toggle-dark-mode':
			ctx.setColorMode(editor.getColorMode() === 'dark' ? 'light' : 'dark')
			return
		case 'view.toggle-pointer-mode': {
			const on = !ui.pointerMode.get()
			if (on) {
				if (!ui.pointerCell.get()) ui.pointerCell.set(canvasCenterCell(ctx.getLayout()))
				ui.setHint('Pointer mode: arrows move · space holds · enter clicks · tab jumps')
			}
			// The input controller releases a held virtual button when it sees the mode go off.
			ui.pointerMode.set(on)
			return
		}
		case 'view.toggle-style-panel':
			ui.stylePanelOpen.set(!ui.stylePanelOpen.get())
			return
		case 'view.toggle-debug':
			ui.debug.set(!ui.debug.get())
			return

		// --- tools ---
		case 'tool.select':
			selectTool(editor)
			return
		case 'tool.hand':
			editor.setCurrentTool('hand')
			return
		case 'tool.draw':
			editor.setCurrentTool('draw')
			return
		case 'tool.eraser':
			editor.setCurrentTool('eraser')
			return
		case 'tool.arrow':
			editor.setCurrentTool('arrow')
			return
		case 'tool.line':
			editor.setCurrentTool('line')
			return
		case 'tool.text':
			editor.setCurrentTool('text')
			return
		case 'tool.note':
			editor.setCurrentTool('note')
			return
		case 'tool.frame':
			editor.setCurrentTool('frame')
			return
		case 'tool.rectangle':
			geoTool(editor, 'rectangle')
			return
		case 'tool.ellipse':
			geoTool(editor, 'ellipse')
			return
		case 'tool.geo':
			geoTool(editor, arg)
			return
		case 'tool.laser':
			editor.setCurrentTool('laser')
			return
		case 'tool.highlight':
			editor.setCurrentTool('highlight')
			return

		// --- pages ---
		case 'page.new':
			editor.run(() => {
				editor.markHistoryStoppingPoint('creating page')
				const pageId = PageRecordType.createId()
				editor.createPage({ name: `Page ${editor.getPages().length + 1}`, id: pageId })
				editor.setCurrentPage(pageId)
			})
			return
		case 'page.rename':
			return renamePage(ctx)
		case 'page.duplicate':
			editor.markHistoryStoppingPoint('duplicate page')
			editor.duplicatePage(editor.getCurrentPageId())
			return
		case 'page.delete':
			if (editor.getPages().length <= 1) return
			editor.markHistoryStoppingPoint('delete page')
			editor.deletePage(editor.getCurrentPageId())
			return
		case 'page.prev':
			switchPage(editor, -1)
			return
		case 'page.next':
			switchPage(editor, 1)
			return
		case 'page.switch':
			if (arg && editor.getPage(arg as TLPageId)) {
				editor.markHistoryStoppingPoint('change-page')
				editor.setCurrentPage(arg as TLPageId)
			}
			return

		// --- ui ---
		case 'ui.menu':
			ctx.popups.openMenu()
			return
		case 'ui.context-menu': {
			const cell = ui.pointerCell.get() ?? canvasCenterCell(ctx.getLayout())
			ctx.popups.openContextMenu(cell.col, cell.row)
			return
		}
		case 'ui.help':
			ctx.popups.openHelp()
			return
		case 'ui.geo-picker':
			ctx.popups.openGeoPicker()
			return
		case 'ui.pages':
			ctx.popups.openPages()
			return
		case 'ui.style-panel':
			toggleStylePanel(ctx)
			return

		// --- modifiers ---
		case 'modifier.toggle-shift':
			toggleLatch(ctx, 'shift')
			return
		case 'modifier.toggle-alt':
			toggleLatch(ctx, 'alt')
			return
		case 'modifier.toggle-ctrl':
			toggleLatch(ctx, 'ctrl')
			return
	}
}

function toggleLatch(ctx: AppContext, name: ModifierName) {
	ctx.ui.toggleLatch(name)
	const latches = ctx.ui.latches.get()
	const label = name === 'ctrl' ? 'Ctrl' : name === 'alt' ? 'Alt' : 'Shift'
	if (!latches[name]) ctx.ui.setHint(`${label} released`)
	else if (latches[name === 'ctrl' ? 'stickyCtrl' : name === 'alt' ? 'stickyAlt' : 'stickyShift']) {
		ctx.ui.setHint(`${label} held until pressed again`)
	} else ctx.ui.setHint(`${label} held for the next pointer action`)
}

function selectTool(editor: Editor) {
	if (editor.isIn('select')) {
		// Editing is a sub-state of select: re-enter the state so a locked text tool is left
		// (useTools.tsx:93-105).
		const current = editor.root.getCurrent()
		if (current) {
			current.exit({}, current.id)
			current.enter({}, current.id)
		}
	}
	editor.setCurrentTool('select')
}

function geoTool(editor: Editor, geo: string | undefined) {
	editor.run(() => {
		if (geo && (GeoShapeGeoStyle.values as readonly string[]).includes(geo)) {
			editor.setStyleForNextShapes(
				GeoShapeGeoStyle,
				geo as (typeof GeoShapeGeoStyle.values)[number]
			)
		}
		editor.setCurrentTool('geo')
	})
}

function startEditingSelectedShape(editor: Editor) {
	const shape = editableTextShape(editor)
	if (!shape) return
	editor.markHistoryStoppingPoint('editing shape')
	if ('richText' in shape.props) {
		startEditingShapeWithRichText(editor, shape, { selectAll: true })
	} else {
		editor.setEditingShape(shape)
		editor.setCurrentTool('select.editing_shape', { target: 'shape', shape })
	}
}

function copySelection(ctx: AppContext) {
	const { editor } = ctx
	const content = editor.getContentFromCurrentPage(editor.getSelectedShapeIds())
	ctx.clipboard.content = content ?? null
	ctx.clipboard.text = null
	// What tldraw puts on the system clipboard as text/plain: the shapes' text, one per line.
	if (ctx.capabilities.osc52) {
		const lines: string[] = []
		for (const shape of editor.getSelectedShapes()) {
			const text = getShapePlaintext(editor, shape)
			if (text) lines.push(text)
		}
		if (lines.length > 0) ctx.terminal.copyToClipboard(lines.join('\n'))
	}
}

function paste(ctx: AppContext) {
	const { editor, clipboard, ui } = ctx
	const atPointer = ui.latches.get().shift
	const point = atPointer ? editor.inputs.getCurrentPagePoint().clone() : undefined
	if (clipboard.content) {
		editor.markHistoryStoppingPoint('pasting')
		editor.putContentOntoCurrentPage(clipboard.content, { point, select: true })
	} else if (clipboard.text) {
		editor.markHistoryStoppingPoint('paste')
		// The React shell registers the external content handlers; headlessly the text handler is
		// called directly.
		void defaultHandleExternalTextContent(editor, { text: clipboard.text, point })
	}
}

/** actions.tsx:575-621 without the `duplicateProps` repeat path, which only a pointer gesture arms. */
function duplicate(editor: Editor) {
	if (!canApplyToUnlockedSelection(editor, 1)) return
	const ids = editor.getSelectedShapeIds()
	let maxX = -Infinity
	let minX = Infinity
	for (const id of ids) {
		const bounds = editor.getShapePageBounds(id)
		if (!bounds) continue
		minX = Math.min(minX, bounds.minX)
		maxX = Math.max(maxX, bounds.maxX)
	}
	const margin = editor.options.adjacentShapeMargin
	const offset = editor.getCameraOptions().isLocked
		? { x: margin, y: margin }
		: { x: (maxX > minX ? maxX - minX : 0) + margin, y: 0 }
	editor.markHistoryStoppingPoint('duplicate shapes')
	editor.duplicateShapes(ids, offset)
}

function arrange(
	editor: Editor,
	minShapes: number,
	markName: string,
	update: (ids: TLShapeId[]) => void
) {
	if (!canApplyToUnlockedSelection(editor, minShapes)) return
	editor.markHistoryStoppingPoint(markName)
	editor.run(() => update(editor.getSelectedShapeIds()))
}

function reorder(editor: Editor, markName: string, update: (ids: TLShapeId[]) => void) {
	if (!canApplyToUnlockedSelection(editor, 1)) return
	editor.markHistoryStoppingPoint(markName)
	update(editor.getSelectedShapeIds())
}

/** actions.tsx:1190-1229: 15° steps (alt: fine steps), landing on the step grid. */
function rotateSelection(editor: Editor, direction: 1 | -1) {
	if (!canApplyToUnlockedSelection(editor, 1)) return
	const isFine = editor.inputs.getAltKey()
	const rotation = HALF_PI / (isFine ? 96 : 6)
	editor.markHistoryStoppingPoint(direction > 0 ? 'rotate-cw' : 'rotate-ccw')
	editor.run(() => {
		const ids = editor.getSelectedShapeIds()
		const offset = editor.getSelectionRotation() % rotation
		if (direction > 0) {
			const dontUseOffset = approximately(offset, 0) || approximately(offset, rotation)
			editor.rotateShapesBy(ids, rotation - (dontUseOffset ? 0 : offset))
		} else {
			editor.rotateShapesBy(ids, approximately(offset, 0) ? -rotation : -offset)
		}
	})
}

function switchPage(editor: Editor, delta: 1 | -1) {
	const pages = editor.getPages()
	const index = currentPageIndex(editor) + delta
	if (index < 0 || index >= pages.length) return
	editor.markHistoryStoppingPoint('change-page')
	editor.setCurrentPage(pages[index].id)
}

function toggleStylePanel(ctx: AppContext) {
	const { ui, editor } = ctx
	const layout = ctx.getLayout()
	if (layout.stylePanel) {
		ui.stylePanelOpen.set(false)
		return
	}
	// A wide terminal docks the panel as soon as there is something to style; otherwise the popup.
	if (
		!ui.stylePanelOpen.get() &&
		layout.cols >= STYLE_PANEL_MIN_COLS &&
		editor.getSharedStyles().size > 0
	) {
		ui.stylePanelOpen.set(true)
		return
	}
	ctx.popups.openStylePanel()
}

// ---------------------------------------------------------------------------------------------
// Files and prompts
// ---------------------------------------------------------------------------------------------

/** Runs `proceed` directly, or after the user chose to save or discard unsaved changes. */
function confirmIfDirty(ctx: AppContext, proceed: () => void | Promise<void>): Promise<void> {
	if (!ctx.ui.dirty.get()) return Promise.resolve(proceed())
	return new Promise<void>((resolve) => {
		ctx.popups.prompt({
			kind: 'confirm',
			label: UNSAVED_PROMPT,
			choices: [
				{ key: 'y', label: 'Save' },
				{ key: 'n', label: 'Discard' },
			],
			onSubmit: async (key) => {
				try {
					if (key.toLowerCase() === 'y') {
						if (await saveDocument(ctx, false)) await proceed()
					} else {
						await proceed()
					}
				} finally {
					resolve()
				}
			},
			onCancel: resolve,
		})
	})
}

/** Saves to the current path, prompting for one when untitled or when `as` is set. */
function saveDocument(ctx: AppContext, as: boolean): Promise<boolean> {
	const current = ctx.ui.filePath.get()
	if (current && !as) return writeDocument(ctx, current)
	return new Promise<boolean>((resolve) => {
		ctx.popups.prompt({
			kind: 'path',
			label: SAVE_PROMPT,
			initial: current ?? '',
			onSubmit: (value) => {
				const path = value.trim()
				if (!path) {
					resolve(false)
					return
				}
				return writeDocument(ctx, path).then(resolve)
			},
			onCancel: () => resolve(false),
		})
	})
}

/**
 * Clean means "the file matches the document now". The snapshot is taken when the save starts and
 * input keeps flowing during the write, so an edit made meanwhile must leave the document dirty: a
 * watcher registered for the duration sees it (`store.listen` first flushes the history that was
 * pending before the snapshot, so an earlier edit cannot re-dirty the saved document later).
 */
async function writeDocument(ctx: AppContext, path: string): Promise<boolean> {
	const { editor, ui } = ctx
	let editedDuringWrite = false
	const stop = watchDocumentChanges(editor, () => (editedDuringWrite = true))
	let result: Awaited<ReturnType<typeof saveTldrFile>>
	try {
		result = await saveTldrFile(editor, path)
		// Store listeners run on the next frame; deliver what the write window produced now.
		editor.store._flushHistory()
	} finally {
		stop()
	}
	if (!result.ok) {
		ui.showError(result.error, ctx.now())
		return false
	}
	ui.filePath.set(path)
	if (!editedDuringWrite) ui.dirty.set(false)
	ui.setHint(`Saved ${path}`)
	return true
}

/**
 * Replacing the document is a store change the dirty watcher would report on the next frame, after
 * the flag was cleared; flushing first delivers it now so the clear is the last word.
 */
function markClean(ctx: AppContext): void {
	ctx.editor.store._flushHistory()
	ctx.ui.dirty.set(false)
}

function openDocument(ctx: AppContext): Promise<void> {
	return new Promise<void>((resolve) => {
		ctx.popups.prompt({
			kind: 'path',
			label: OPEN_PROMPT,
			initial: '',
			onSubmit: async (value) => {
				try {
					const path = value.trim()
					if (!path) return
					const result = await loadTldrFile(ctx.editor, path)
					if (!result.ok) {
						ctx.ui.showError(result.error, ctx.now())
						return
					}
					ctx.ui.filePath.set(path)
					markClean(ctx)
					ctx.ui.setHint(`Opened ${path}`)
				} finally {
					resolve()
				}
			},
			onCancel: resolve,
		})
	})
}

function newDocument(ctx: AppContext) {
	const { editor, ui } = ctx
	editor.run(() => {
		editor.loadSnapshot({ document: { schema: editor.store.schema.serialize(), store: {} } })
		editor.clearHistory()
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
	})
	ui.filePath.set(null)
	markClean(ctx)
	ui.setHint('New document')
}

function exportDocumentText(ctx: AppContext): Promise<void> {
	const current = ctx.ui.filePath.get()
	const initial = current ? current.replace(/\.tldr$/i, '') + '.txt' : ''
	const selectionOnly = ctx.editor.getSelectedShapeIds().length > 0
	return new Promise<void>((resolve) => {
		ctx.popups.prompt({
			kind: 'path',
			label: EXPORT_PROMPT,
			initial,
			onSubmit: async (value) => {
				try {
					const path = value.trim()
					if (!path) return
					const result = await exportTextFile(ctx.editor, path, ctx.renderToText, {
						selectionOnly,
					})
					if (!result.ok) {
						ctx.ui.showError(result.error, ctx.now())
						return
					}
					let hint = `Exported ${path}`
					if (ctx.capabilities.osc52 && ctx.terminal.copyToClipboard(result.text)) {
						hint += ` ${ctx.glyphs.bullet} sent to terminal clipboard`
					}
					ctx.ui.setHint(hint)
				} finally {
					resolve()
				}
			},
			onCancel: resolve,
		})
	})
}

function renamePage(ctx: AppContext): Promise<void> {
	const { editor } = ctx
	const page = editor.getCurrentPage()
	return new Promise<void>((resolve) => {
		ctx.popups.prompt({
			kind: 'text',
			label: RENAME_PAGE_PROMPT,
			initial: page.name,
			onSubmit: (value) => {
				const name = value.trim()
				if (name && name !== page.name) {
					editor.markHistoryStoppingPoint('rename page')
					editor.renamePage(page.id, name)
				}
				resolve()
			},
			onCancel: resolve,
		})
	})
}
