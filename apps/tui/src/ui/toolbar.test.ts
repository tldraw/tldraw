import { GeoShapeGeoStyle } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ACTION_META } from '../actions/actionIds'
import { getGlyphs } from '../terminal/chars'
import { stringWidth } from '../terminal/width'
import { createTestContext, type TestContext } from '../test/testContext'
import {
	TOOL_ITEMS,
	TOOLBAR_ICONS,
	getActiveToolLabel,
	getActiveToolbarItem,
	toolbarItemHint,
	toolbarItemText,
} from './toolbar'

describe('toolbar items', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
	})
	afterEach(() => ctx.dispose())

	it('lists the fourteen tools with unique keys and known actions', () => {
		expect(TOOL_ITEMS.map((i) => i.key).join(' ')).toBe('v h d e a l t n f r o g k D')
		expect(new Set(TOOL_ITEMS.map((i) => i.key)).size).toBe(14)
		for (const item of TOOL_ITEMS) {
			expect(ACTION_META[item.action.id]).toBeDefined()
			expect(item.short.length).toBe(3)
		}
		expect(TOOLBAR_ICONS.map((i) => i.action.id)).toEqual([
			'edit.undo',
			'edit.redo',
			'ui.menu',
			'ui.help',
		])
	})

	it('formats items per density within the width budget', () => {
		const glyphs = getGlyphs('rich')
		const full = TOOL_ITEMS.map((i) => toolbarItemText(i, 'full', glyphs))
		const compact = TOOL_ITEMS.map((i) => toolbarItemText(i, 'compact', glyphs))
		const minimal = TOOL_ITEMS.map((i) => toolbarItemText(i, 'minimal', glyphs))
		expect(full[0]).toBe('v select')
		expect(full[11]).toBe('g geo▾')
		expect(compact[0]).toBe('v sel')
		expect(minimal.join(' ')).toBe('v h d e a l t n f r o g k D')
		// Single-space separators, a one-space gap and the `↶ ↷ ≡ ?` (full) or `≡ ?` (compact) group.
		expect(stringWidth(full.join(' ')) + 1 + 7).toBeLessThanOrEqual(120)
		expect(stringWidth(compact.join(' ')) + 1 + 3).toBeLessThanOrEqual(90)
		expect(toolbarItemText(TOOL_ITEMS[11], 'full', getGlyphs('ascii'))).toBe('g geov')
	})

	it('finds the active item and its label', () => {
		expect(getActiveToolbarItem(ctx.editor)!.id).toBe('tool.select')
		expect(getActiveToolLabel(ctx.editor)).toBe('Select')
		ctx.editor.setCurrentTool('geo')
		expect(getActiveToolbarItem(ctx.editor)!.id).toBe('tool.rectangle')
		expect(getActiveToolLabel(ctx.editor)).toBe('Rectangle')
		ctx.editor.setStyleForNextShapes(GeoShapeGeoStyle, 'arrow-right')
		expect(getActiveToolbarItem(ctx.editor)!.id).toBe('tool.geo')
		expect(getActiveToolLabel(ctx.editor)).toBe('Arrow right')
		ctx.editor.setCurrentTool('highlight')
		expect(getActiveToolbarItem(ctx.editor)!.id).toBe('tool.highlight')
		expect(getActiveToolLabel(ctx.editor)).toBe('Highlighter')
		ctx.editor.setCurrentTool('zoom')
		expect(getActiveToolbarItem(ctx.editor)).toBeNull()
		expect(getActiveToolLabel(ctx.editor)).toBe('Zoom')
	})

	it('builds hover hints from the action label and key', () => {
		expect(toolbarItemHint(TOOL_ITEMS[0])).toBe('Select (v)')
		expect(toolbarItemHint(TOOL_ITEMS[11])).toBe('Shape (g)')
	})
})
