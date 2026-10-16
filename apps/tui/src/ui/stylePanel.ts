import { getColorValue, type Editor } from '@tldraw/editor'
import { EnumStyleProp, type StyleProp } from '@tldraw/tlschema'
import { parseColor, type Rgb } from '../terminal/colors'

export interface StyleRow {
	/** Stable id: the style prop id without `tldraw:`, or `opacity`. */
	id: string
	label: string
	/** null for the opacity row. */
	prop: StyleProp<unknown> | null
	values: readonly string[]
	/** What each value is shown as (percentages for opacity). */
	display: readonly string[]
	/** null when the selection has mixed values. */
	current: string | null
	jumpKey?: string
	isColor: boolean
}

/** tldraw's opacity picker values (DefaultStylePanelContent.tsx), so files round-trip exactly. */
export const OPACITY_STEPS: readonly number[] = [0.1, 0.25, 0.5, 0.75, 1]

/** The docked panel needs this many columns; narrower terminals get the popup. */
export const STYLE_PANEL_MIN_COLS = 110

/** Styles are relevant when something is selected or a tool that creates shapes is active. */
export function stylesRelevant(editor: Editor): boolean {
	if (editor.getSelectedShapeIds().length > 0) return true
	return !!editor.root.getCurrent()?.shapeType
}

interface RowDef {
	label: string
	jumpKey?: string
	hide?(value: string): boolean
	/** Display order when it differs from the schema's (tldraw's fill row puts the extras last). */
	order?: readonly string[]
}

// White is tldraw's easter-egg colour (styles.tsx getColorStyleItems skips it); invisible on a
// light canvas.
function hideWhite(value: string): boolean {
	return value === 'white'
}

// Same order as DefaultStylePanelContent.tsx; legacy align values and dash 'none' are hidden
// there too (STYLES in packages/tldraw/src/lib/styles.tsx).
const ROW_DEFS: ReadonlyArray<[id: string, def: RowDef]> = [
	['tldraw:color', { label: 'color', jumpKey: 'c', hide: hideWhite }],
	['opacity', { label: 'opacity', jumpKey: 'o' }],
	[
		'tldraw:fill',
		{
			label: 'fill',
			jumpKey: 'f',
			order: ['none', 'semi', 'solid', 'pattern', 'lined-fill', 'fill'],
		},
	],
	['tldraw:dash', { label: 'dash', jumpKey: 'd', hide: (v) => v === 'none' }],
	['tldraw:size', { label: 'size', jumpKey: 'z' }],
	['tldraw:font', { label: 'font', jumpKey: 'F' }],
	['tldraw:textAlign', { label: 'text', jumpKey: 't' }],
	['tldraw:horizontalAlign', { label: 'align', jumpKey: 'a', hide: (v) => v.endsWith('-legacy') }],
	['tldraw:verticalAlign', { label: 'v-align', jumpKey: 'v' }],
	['tldraw:geo', { label: 'geo', jumpKey: 'g' }],
	['tldraw:arrowKind', { label: 'arrow', jumpKey: 'k' }],
	['tldraw:arrowheadStart', { label: 'start', jumpKey: 's' }],
	['tldraw:arrowheadEnd', { label: 'end', jumpKey: 'e' }],
	['tldraw:spline', { label: 'spline', jumpKey: 'p' }],
	['tldraw:labelColor', { label: 'label', jumpKey: 'l', hide: hideWhite }],
]

const ROW_ORDER = new Map(ROW_DEFS.map(([id], index) => [id, index]))

function fallbackLabel(id: string): string {
	return id
		.replace(/^tldraw:/, '')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.toLowerCase()
}

function formatOpacity(value: number): string {
	return `${Math.round(value * 100)}%`
}

function nearestOpacityStep(value: number): number {
	let best = OPACITY_STEPS[0]
	for (const step of OPACITY_STEPS) {
		if (Math.abs(step - value) < Math.abs(best - value)) best = step
	}
	return best
}

/**
 * The rows of the style panel: one per shared style of the selection (or of the active shape
 * tool's next shape), plus opacity. Empty in the select tool with nothing selected, like
 * tldraw's `useRelevantStyles`.
 */
export function buildStyleRows(editor: Editor): StyleRow[] {
	const shared = editor.getSharedStyles()
	const hasSelection = editor.getSelectedShapeIds().length > 0
	if (shared.size === 0 && !hasSelection) return []

	const rows: StyleRow[] = []
	for (const [prop, value] of shared) {
		if (!(prop instanceof EnumStyleProp)) continue
		const def = ROW_DEFS.find(([id]) => id === prop.id)?.[1]
		const hide = def?.hide
		const values: string[] = []
		for (const v of prop.values) {
			const s = String(v)
			if (hide && hide(s)) continue
			values.push(s)
		}
		if (values.length === 0) continue
		if (def?.order) {
			const order = def.order
			values.sort((a, b) => order.indexOf(a) - order.indexOf(b))
		}
		rows.push({
			id: prop.id.replace(/^tldraw:/, ''),
			label: def?.label ?? fallbackLabel(prop.id),
			prop,
			values,
			display: values,
			current: value.type === 'shared' ? String(value.value) : null,
			jumpKey: def?.jumpKey,
			isColor: prop.id === 'tldraw:color' || prop.id === 'tldraw:labelColor',
		})
	}

	const opacity = editor.getSharedOpacity()
	rows.push({
		id: 'opacity',
		label: 'opacity',
		prop: null,
		values: OPACITY_STEPS.map(String),
		display: OPACITY_STEPS.map(formatOpacity),
		current: opacity.type === 'shared' ? String(nearestOpacityStep(opacity.value)) : null,
		jumpKey: 'o',
		isColor: false,
	})

	rows.sort((a, b) => orderOf(a) - orderOf(b))
	return rows
}

function orderOf(row: StyleRow): number {
	const key = row.prop ? row.prop.id : 'opacity'
	return ROW_ORDER.get(key) ?? ROW_DEFS.length
}

/**
 * Applies a value the way tldraw's StylePanelContext does (StylePanelContext.tsx:36-55): the
 * selection when in the select tool, and always the next shapes. `isChangingStyle` hides the
 * selection indicator for a second (Editor.ts resets it), so the new colour shows on the shape
 * instead of under a blue outline.
 */
export function applyStyleValue(editor: Editor, row: StyleRow, value: string): void {
	if (!row.values.includes(value)) return
	editor.markHistoryStoppingPoint(`style ${row.id}`)
	if (row.prop === null) {
		const opacity = Number(value)
		editor.run(() => {
			if (editor.isIn('select')) editor.setOpacityForSelectedShapes(opacity)
			editor.setOpacityForNextShapes(opacity)
			editor.updateInstanceState({ isChangingStyle: true })
		})
		return
	}
	const prop = row.prop
	editor.run(() => {
		if (editor.isIn('select')) editor.setStyleForSelectedShapes(prop, value)
		editor.setStyleForNextShapes(prop, value)
		editor.updateInstanceState({ isChangingStyle: true })
	})
}

/** Moves to the previous/next value (wrapping); a mixed row starts from its first value. */
export function stepStyleValue(editor: Editor, row: StyleRow, delta: number): void {
	const n = row.values.length
	if (n === 0) return
	const index = row.current === null ? -1 : row.values.indexOf(row.current)
	const next = index < 0 ? (delta > 0 ? 0 : n - 1) : (((index + delta) % n) + n) % n
	applyStyleValue(editor, row, row.values[next])
}

/** The theme's solid colour of a palette entry, for swatches. Custom colours pass through. */
export function swatchColor(editor: Editor, colorName: string): Rgb {
	const colors = editor.getCurrentTheme().colors[editor.getColorMode()]
	const parsed = parseColor(getColorValue(colors, colorName, 'solid'))
	return parsed ? parsed.rgb : -1
}

export function findStyleRowByKey(rows: readonly StyleRow[], key: string): number {
	return rows.findIndex((row) => row.jumpKey === key)
}
