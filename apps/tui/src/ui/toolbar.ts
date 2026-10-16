import type { Editor } from '@tldraw/editor'
import { GeoShapeGeoStyle } from '@tldraw/tlschema'
import { ACTION_META, type ActionInvocation } from '../actions/actionIds'
import type { ChromeDensity } from '../app/context'
import type { GlyphSet } from '../terminal/chars'

export interface ToolbarItem {
	/** Hot region id. */
	id: string
	/** The shortcut shown in the bar (also the minimal-density glyph). */
	key: string
	/** Lowercase label for the full density. */
	label: string
	/** Three-letter label for the compact density. */
	short: string
	action: ActionInvocation
	/** `editor.getCurrentToolId()` values that light this item up. */
	toolIds: readonly string[]
	/** For geo items: the next-shape geo value that must also match. */
	geo?: string
	/** Draws a picker caret after the label (full density). */
	picker?: boolean
}

export const TOOL_ITEMS: readonly ToolbarItem[] = [
	tool('tool.select', 'v', 'select', 'sel', ['select']),
	tool('tool.hand', 'h', 'hand', 'hnd', ['hand']),
	tool('tool.draw', 'd', 'draw', 'drw', ['draw']),
	tool('tool.eraser', 'e', 'eraser', 'ers', ['eraser']),
	tool('tool.arrow', 'a', 'arrow', 'arw', ['arrow']),
	tool('tool.line', 'l', 'line', 'lin', ['line']),
	tool('tool.text', 't', 'text', 'txt', ['text']),
	tool('tool.note', 'n', 'note', 'nte', ['note']),
	tool('tool.frame', 'f', 'frame', 'frm', ['frame']),
	{ ...tool('tool.rectangle', 'r', 'rect', 'rct', ['geo']), geo: 'rectangle' },
	{ ...tool('tool.ellipse', 'o', 'ellipse', 'ell', ['geo']), geo: 'ellipse' },
	{
		id: 'tool.geo',
		key: 'g',
		label: 'geo',
		short: 'geo',
		action: { id: 'ui.geo-picker' },
		toolIds: ['geo'],
		picker: true,
	},
	tool('tool.laser', 'k', 'laser', 'lsr', ['laser']),
	tool('tool.highlight', 'D', 'highlight', 'hlt', ['highlight']),
]

function tool(
	id: ToolbarItem['action']['id'],
	key: string,
	label: string,
	short: string,
	toolIds: readonly string[]
): ToolbarItem {
	return { id, key, label, short, action: { id }, toolIds }
}

export interface ToolbarIcon {
	id: string
	action: ActionInvocation
	glyph(glyphs: GlyphSet): string
	label: string
	enabled(editor: Editor): boolean
}

/** Undo, redo, menu and help, drawn at the right end of the toolbar. */
export const TOOLBAR_ICONS: readonly ToolbarIcon[] = [
	{
		id: 'toolbar.undo',
		action: { id: 'edit.undo' },
		glyph: (g) => g.undo,
		label: 'Undo',
		enabled: (editor) => editor.getCanUndo(),
	},
	{
		id: 'toolbar.redo',
		action: { id: 'edit.redo' },
		glyph: (g) => g.redo,
		label: 'Redo',
		enabled: (editor) => editor.getCanRedo(),
	},
	{
		id: 'toolbar.menu',
		action: { id: 'ui.menu' },
		glyph: (g) => g.menu,
		label: 'Menu',
		enabled: () => true,
	},
	{
		id: 'toolbar.help',
		action: { id: 'ui.help' },
		glyph: (g) => g.help,
		label: 'Keyboard shortcuts',
		enabled: () => true,
	},
]

/**
 * The toolbar item that represents the active tool: rect/ellipse win over the generic geo item
 * when the next geo style matches, mirroring how tldraw's toolbar highlights geo tools.
 */
export function getActiveToolbarItem(editor: Editor): ToolbarItem | null {
	const toolId = editor.getCurrentToolId()
	let fallback: ToolbarItem | null = null
	for (const item of TOOL_ITEMS) {
		if (!item.toolIds.includes(toolId)) continue
		if (item.geo === undefined) {
			if (toolId !== 'geo') return item
			fallback = item
			continue
		}
		if (editor.getStyleForNextShape(GeoShapeGeoStyle) === item.geo) return item
	}
	return fallback
}

/** Sentence-case name of the active tool for the status bar. */
export function getActiveToolLabel(editor: Editor): string {
	const item = getActiveToolbarItem(editor)
	if (item) {
		if (item.id === 'tool.geo') {
			const geo = editor.getStyleForNextShape(GeoShapeGeoStyle)
			return geo.charAt(0).toUpperCase() + geo.slice(1).replace(/-/g, ' ')
		}
		const meta = ACTION_META[item.id as ActionInvocation['id']]
		if (meta) return meta.label
	}
	const toolId = editor.getCurrentToolId()
	return toolId.charAt(0).toUpperCase() + toolId.slice(1)
}

/** Text of one tool item at a density: `v select`, `v sel` or `v`. */
export function toolbarItemText(
	item: ToolbarItem,
	density: ChromeDensity,
	glyphs: GlyphSet
): string {
	switch (density) {
		case 'full':
			return `${item.key} ${item.label}${item.picker ? glyphs.caretDown : ''}`
		case 'compact':
			return `${item.key} ${item.short}`
		default:
			return item.key
	}
}

export function toolbarItemHint(item: ToolbarItem): string {
	const meta = ACTION_META[item.id as ActionInvocation['id']]
	const label = meta ? meta.label : item.label
	return `${label} (${item.key})`
}
