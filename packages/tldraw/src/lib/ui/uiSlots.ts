import { Editor, defineSlot } from '@tldraw/editor'
import type { TLUiEventHandler, TLUiEventSource } from './context/events'
import type { TLUiToolItem } from './hooks/useTools'
import type { TLUiOverrideHelpers } from './overrides'

/**
 * What a {@link uiToolItemsSlot} contribution gets when the UI builds its tool items.
 *
 * @public
 */
export interface TLUiToolItemsContext {
	editor: Editor
	helpers: TLUiOverrideHelpers
	/**
	 * Announce the tool to screen readers and record a `select-tool` event. Call it from a tool
	 * item's `onSelect`. Pass `id` when the event id differs from the item id.
	 */
	onToolSelect(source: TLUiEventSource, tool: TLUiToolItem, id?: string): void
	trackEvent: TLUiEventHandler
}

/**
 * The tool items that a plugin adds to the UI. A tool item is defined once and used everywhere it
 * appears: the toolbar, keyboard shortcuts, the shortcuts dialog and the command palette. Where an
 * item appears in the toolbar is a separate contribution, to {@link uiToolbarSlot}.
 *
 * @example
 * ```ts
 * definePlugin({
 *   id: 'cardShape',
 *   shapeUtils: [CardShapeUtil],
 *   tools: [CardShapeTool],
 *   setup(ctx) {
 *     ctx.contribute(uiToolItemsSlot, ({ editor, onToolSelect }) => [
 *       {
 *         id: 'card',
 *         label: 'tool.card',
 *         icon: 'tool-note',
 *         kbd: 'c',
 *         onSelect(source) {
 *           editor.setCurrentTool('card')
 *           onToolSelect(source, this)
 *         },
 *       },
 *     ])
 *     ctx.contribute(uiToolbarSlot, { tool: 'card' })
 *   },
 * })
 * ```
 *
 * @public
 */
export const uiToolItemsSlot =
	defineSlot<(ctx: TLUiToolItemsContext) => TLUiToolItem[]>('ui.toolItems')

/**
 * A place for a tool item in the default toolbar. The default toolbar shows its built-in items
 * first, in their usual order, then these placements in plugin order. A placement for a tool item
 * that no plugin defines shows nothing.
 *
 * @public
 */
export interface TLUiToolbarPlacement {
	/** The id of the tool item, from {@link uiToolItemsSlot}. */
	tool: string
}

/**
 * Where tool items appear in the default toolbar. See {@link TLUiToolbarPlacement}.
 *
 * @public
 */
export const uiToolbarSlot = defineSlot<TLUiToolbarPlacement>('ui.toolbar')
