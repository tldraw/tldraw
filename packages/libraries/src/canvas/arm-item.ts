import {
	type Editor,
	EditorAtom,
	type StyleProp,
	type TLContent,
	type TLLibraryItemId,
} from 'tldraw'
import type { LibrarySource, TLLibraryItemTool } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { getContentBounds } from './stamp-item'

/** The id of {@link LibraryStampTool}. */
export const LIBRARY_STAMP_TOOL_ID = 'library-stamp'

/** Whether the host has added {@link LibraryStampTool} to the editor's tools, so items can be armed. */
export function hasLibraryStampTool(editor: Editor) {
	return editor.root.children?.[LIBRARY_STAMP_TOOL_ID] !== undefined
}

/** The item the stamp tool places, with its content loaded. */
export interface ArmedStamp {
	source: LibrarySource
	itemId: TLLibraryItemId
	content: TLContent
	/** The content's size on the page at its own size. */
	size: { w: number; h: number }
	item?: TLLibraryItem
	/** The thumbnail the item was armed from, shown in place of the item's own. */
	thumbnailUrl?: string
}

/** The stamp tool's item. Scoped per editor. */
export const armedStamp = new EditorAtom<ArmedStamp | null>('armedLibraryStamp', () => null)

// Arming loads the item first, so a slow load must not arm over an item picked after it.
const latestArming = new WeakMap<Editor, object>()

// Styles are named by id; the editor knows them per shape type.
function findStyle(editor: Editor, styleId: string): StyleProp<unknown> | undefined {
	for (const styles of Object.values(editor.styleProps)) {
		for (const style of styles.keys()) {
			if (style.id === styleId) return style
		}
	}
	return undefined
}

function armTool(editor: Editor, tool: TLLibraryItemTool) {
	editor.run(() => {
		for (const [styleId, value] of Object.entries(tool.styles ?? {})) {
			const style = findStyle(editor, styleId)
			if (style) editor.setStyleForNextShapes(style, value)
		}
		editor.setCurrentTool(tool.toolId)
	})
}

// Its tool is current and its styles are the ones in use.
function isToolArmed(editor: Editor, tool: TLLibraryItemTool) {
	if (editor.getCurrentToolId() !== tool.toolId) return false
	return Object.entries(tool.styles ?? {}).every(([styleId, value]) => {
		const style = findStyle(editor, styleId)
		if (!style) return false
		const current =
			editor.getSharedStyles().getAsKnownValue(style) ?? editor.getStyleForNextShape(style)
		return current === value
	})
}

function findItem(source: LibrarySource, itemId: TLLibraryItemId) {
	for (const library of source.getLibraries()) {
		const item = source.getItems(library.id).find((i) => i.id === itemId)
		if (item) return item
	}
	return undefined
}

/** @public */
export interface ArmLibraryItemOptions {
	/**
	 * The thumbnail the user picked the item by, such as its tile's, for {@link LibraryStampPreview}
	 * to show under the pointer. Defaults to the item's own thumbnail.
	 */
	thumbnailUrl?: string
}

/**
 * Arms an item, the way picking a tool in the toolbar arms it. An item that stands for a tool (see
 * {@link LibrarySource.getItemTool}) arms that tool with its styles; any other item is loaded and
 * arms {@link LibraryStampTool} with it, to place copies where the user clicks or drags. Rejects
 * with the source's error when the item can't be loaded.
 *
 * The host must have added {@link LibraryStampTool} to the editor's tools.
 * @public
 */
export async function armLibraryItem(
	editor: Editor,
	source: LibrarySource,
	itemId: TLLibraryItemId,
	options: ArmLibraryItemOptions = {}
) {
	const request = {}
	latestArming.set(editor, request)
	const tool = source.getItemTool?.(itemId)
	if (tool) {
		armTool(editor, tool)
		return
	}
	const { content } = await source.getItemContent(itemId)
	if (latestArming.get(editor) !== request) return
	const bounds = getContentBounds(editor, content)
	editor.run(() => {
		armedStamp.set(editor, {
			source,
			itemId,
			content,
			size: { w: bounds?.w ?? 0, h: bounds?.h ?? 0 },
			item: findItem(source, itemId),
			thumbnailUrl: options.thumbnailUrl,
		})
		editor.setCurrentTool(LIBRARY_STAMP_TOOL_ID)
	})
}

/**
 * Whether an item is armed: its tool, for an item that stands for one, or the stamp tool with it.
 * Reactive.
 * @public
 */
export function isLibraryItemArmed(
	editor: Editor,
	source: LibrarySource,
	itemId: TLLibraryItemId
): boolean {
	const tool = source.getItemTool?.(itemId)
	if (tool) return isToolArmed(editor, tool)
	if (editor.getCurrentToolId() !== LIBRARY_STAMP_TOOL_ID) return false
	const armed = armedStamp.get(editor)
	return armed !== null && armed.source === source && armed.itemId === itemId
}
