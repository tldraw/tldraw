import { basename } from 'node:path'
import type { Editor } from '@tldraw/editor'
import type { ChromeDensity, ChromeLayout, HotRegion } from '../app/context'
import { getShapePlaintext } from '../editor/richText'
import { asciiSafe, getGlyphs, type GlyphSet } from '../terminal/chars'
import { parseColor, type Rgb } from '../terminal/colors'
import type { CellStyle, Rect, Screen } from '../terminal/Screen'
import type { TerminalCapabilities } from '../terminal/Terminal'
import { graphemes, stringWidth } from '../terminal/width'
import { encodingLabel } from '../ui/help'
import {
	buildPopupModel,
	layoutStyleRows,
	popupRect,
	type ListBox,
	type PopupModel,
	type StyleRowLayout,
	DOCKED_LABEL_WIDTH,
	SWATCH_WIDTH,
} from '../ui/popups'
import { promptLabelText } from '../ui/prompt'
import {
	STYLE_PANEL_MIN_COLS,
	buildStyleRows,
	stepStyleValue,
	stylesRelevant,
	swatchColor,
} from '../ui/stylePanel'
import {
	TOOL_ITEMS,
	TOOLBAR_ICONS,
	getActiveToolLabel,
	getActiveToolbarItem,
	toolbarItemHint,
	toolbarItemText,
} from '../ui/toolbar'
import type { DebugStats, PopupState, PromptState, UiState } from '../ui/UiState'

/** The UI atoms the layout depends on, read once per frame by the App. */
export interface UiSnapshot {
	popup: PopupState | null
	stylePanelOpen: boolean
	keyboardEncoding: 'legacy' | 'full'
}

export function snapshotUi(ui: UiState): UiSnapshot {
	return {
		popup: ui.popup.get(),
		stylePanelOpen: ui.stylePanelOpen.get(),
		keyboardEncoding: ui.keyboardEncoding.get(),
	}
}

export interface ChromeContext {
	editor: Editor
	ui: UiState
	glyphs: GlyphSet
	colorMode: 'light' | 'dark'
	capabilities: TerminalCapabilities
	filePath: string | null
	dirty: boolean
	debugStats: DebugStats | null
	/** `performance.now()` of this frame, for expiring errors. */
	now: number
	/** For the help overlay's terminal hints; defaults to `process.env`. */
	env?: NodeJS.ProcessEnv
}

export { STYLE_PANEL_MIN_COLS, stylesRelevant } from '../ui/stylePanel'

export const STYLE_PANEL_WIDTH = 18
export const COORDS_MIN_COLS = 100
export const HINT_MIN_COLS = 120
export const FIRST_RUN_HINT = '? help · m menu'

export function densityFor(cols: number): ChromeDensity {
	return cols >= 120 ? 'full' : cols >= 90 ? 'compact' : 'minimal'
}

export function layoutChrome(
	cols: number,
	rows: number,
	ui: UiSnapshot,
	editor: Editor
): ChromeLayout {
	const toolbarRow = 0
	const statusRow = rows - 1
	const canvasH = Math.max(1, rows - 2)
	const canvas: Rect = { x: 0, y: 1, w: cols, h: canvasH }
	let stylePanel: Rect | null = null
	if (cols >= STYLE_PANEL_MIN_COLS && ui.stylePanelOpen && stylesRelevant(editor)) {
		stylePanel = { x: cols - STYLE_PANEL_WIDTH, y: 1, w: STYLE_PANEL_WIDTH, h: canvasH }
		canvas.w = cols - STYLE_PANEL_WIDTH
	}
	const popup = ui.popup
		? popupRect(ui.popup, cols, rows, editor, ui.keyboardEncoding, getGlyphs('rich'))
		: null
	return {
		cols,
		rows,
		canvas,
		toolbarRow,
		statusRow,
		stylePanel,
		popup,
		density: densityFor(cols),
	}
}

interface ChromePalette {
	bg: Rgb
	text: Rgb
	muted: Rgb
	accent: Rgb
	onAccent: Rgb
	danger: Rgb
	border: Rgb
}

// Values from packages/editor/editor.css (.tl-theme__light / .tl-theme__dark): panel, text,
// text-3, selected, selected-contrast, danger and divider.
const PALETTES: Record<'light' | 'dark', ChromePalette> = {
	light: {
		bg: rgb('hsl(0, 0%, 99%)'),
		text: rgb('hsl(0, 0%, 0%)'),
		muted: rgb('hsl(204, 4%, 45%)'),
		accent: rgb('hsl(214, 84%, 56%)'),
		onAccent: rgb('hsl(0, 0%, 100%)'),
		danger: rgb('hsl(0, 90%, 43%)'),
		border: rgb('hsl(0, 0%, 80%)'),
	},
	dark: {
		bg: rgb('hsl(235, 6.8%, 13.5%)'),
		text: rgb('hsl(210, 17%, 98%)'),
		muted: rgb('hsl(204, 4%, 75%)'),
		accent: rgb('hsl(217, 89%, 61%)'),
		onAccent: rgb('hsl(0, 0%, 100%)'),
		danger: rgb('hsl(0, 90%, 65%)'),
		border: rgb('hsl(240, 9%, 30%)'),
	},
}

function rgb(css: string): Rgb {
	return parseColor(css)?.rgb ?? -1
}

export function chromePalette(mode: 'light' | 'dark'): ChromePalette {
	return PALETTES[mode]
}

/** Truncates to `width` cells, ending with the glyph set's ellipsis when something was cut. */
export function fitText(s: string, width: number, ellipsis: string): string {
	if (width <= 0) return ''
	if (stringWidth(s) <= width) return s
	const parts = graphemes(s)
	let out = ''
	let used = 0
	const ellipsisW = stringWidth(ellipsis)
	for (const g of parts) {
		const w = stringWidth(g)
		if (used + w > width - ellipsisW) break
		out += g
		used += w
	}
	return out + ellipsis
}

/**
 * Draws the toolbar, status row, docked style panel and the open popup. Returns the clickable
 * regions (toolbar items, status toggles and docked style cells); popups do their own hit
 * testing in `ui/popups.ts`.
 */
export function renderChrome(
	screen: Screen,
	layout: ChromeLayout,
	ctx: ChromeContext
): HotRegion[] {
	const regions: HotRegion[] = []
	const pal = chromePalette(ctx.colorMode)
	renderToolbar(screen, layout, ctx, pal, regions)
	renderStatus(screen, layout, ctx, pal, regions)
	if (layout.stylePanel) renderDockedStylePanel(screen, layout.stylePanel, ctx, pal, regions)
	const popup = ctx.ui.popup.get()
	if (popup && popup.kind !== 'prompt') renderPopup(screen, layout, ctx, pal, popup)
	return regions
}

function renderToolbar(
	screen: Screen,
	layout: ChromeLayout,
	ctx: ChromeContext,
	pal: ChromePalette,
	regions: HotRegion[]
) {
	const row = layout.toolbarRow
	const cols = layout.cols
	const { editor, glyphs } = ctx
	screen.fillRect({ x: 0, y: row, w: cols, h: 1 }, ' ', { fg: pal.text, bg: pal.bg })
	const active = getActiveToolbarItem(editor)
	const base: CellStyle = { fg: pal.text, bg: pal.bg }
	const keyStyle: CellStyle = { fg: pal.accent, bg: pal.bg, bold: true }
	const activeStyle: CellStyle = { fg: pal.onAccent, bg: pal.accent, bold: true }
	// No leading space: with full labels the bar is exactly 120 cells wide, the full threshold.
	let x = 0
	for (const item of TOOL_ITEMS) {
		const text = toolbarItemText(item, layout.density, glyphs)
		const w = stringWidth(text)
		if (x + w > cols) break
		const isActive = item === active
		if (isActive) {
			screen.text(x, row, text, activeStyle)
		} else if (layout.density === 'minimal') {
			screen.text(x, row, text, keyStyle)
		} else {
			screen.text(x, row, item.key, keyStyle)
			screen.text(x + stringWidth(item.key), row, text.slice(item.key.length), base)
		}
		regions.push({
			id: item.id,
			rect: { x, y: row, w, h: 1 },
			action: item.action,
			hint: toolbarItemHint(item),
		})
		x += w + 1
	}

	// Right group, right-aligned: the widest variant that still leaves a gap after the tools.
	const sep = glyphs.boxLight[5]
	for (const tokens of RIGHT_GROUP_VARIANTS) {
		const width = tokens.length * 2 - 1
		if (x + width > cols) continue
		let rx = cols - width
		for (const icon of tokens) {
			if (icon) {
				const enabled = icon.enabled(editor)
				screen.text(rx, row, icon.glyph(glyphs), {
					fg: enabled ? pal.text : pal.muted,
					bg: pal.bg,
					dim: !enabled,
				})
				regions.push({
					id: icon.id,
					rect: { x: rx, y: row, w: 1, h: 1 },
					action: icon.action,
					hint: icon.label,
				})
			} else {
				screen.put(rx, row, sep, { fg: pal.border, bg: pal.bg })
			}
			rx += 2
		}
		break
	}
}

/** `│ ↶ ↷ │ ≡ ?`, then `↶ ↷ ≡ ?`, then `≡ ?`; null entries are separators. */
const RIGHT_GROUP_VARIANTS: ReadonlyArray<ReadonlyArray<(typeof TOOLBAR_ICONS)[number] | null>> = [
	[null, TOOLBAR_ICONS[0], TOOLBAR_ICONS[1], null, TOOLBAR_ICONS[2], TOOLBAR_ICONS[3]],
	[TOOLBAR_ICONS[0], TOOLBAR_ICONS[1], TOOLBAR_ICONS[2], TOOLBAR_ICONS[3]],
	[TOOLBAR_ICONS[2], TOOLBAR_ICONS[3]],
]

interface Segment {
	text: string
	style: CellStyle
	action?: HotRegion['action']
	id?: string
}

function renderStatus(
	screen: Screen,
	layout: ChromeLayout,
	ctx: ChromeContext,
	pal: ChromePalette,
	regions: HotRegion[]
) {
	const row = layout.statusRow
	const cols = layout.cols
	screen.fillRect({ x: 0, y: row, w: cols, h: 1 }, ' ', { fg: pal.text, bg: pal.bg })
	const popup = ctx.ui.popup.get()
	if (popup?.kind === 'prompt') {
		renderPrompt(screen, row, cols, popup.prompt, ctx, pal)
		return
	}

	const { editor, glyphs, ui } = ctx
	const base: CellStyle = { fg: pal.text, bg: pal.bg }
	const muted: CellStyle = { fg: pal.muted, bg: pal.bg }
	const accent: CellStyle = { fg: pal.accent, bg: pal.bg, bold: true }

	// Right side first: it always wins over the left segments.
	const right: Segment[] = []
	const name = ctx.filePath ? basename(ctx.filePath) : 'untitled'
	right.push({ text: ctx.dirty ? `${name}*` : name, style: ctx.dirty ? accent : muted })
	if (editor.getInstanceState().isGridMode) {
		right.push({
			text: 'grid',
			style: accent,
			action: { id: 'view.toggle-grid' },
			id: 'status.grid',
		})
	}
	if (editor.user.getIsSnapMode()) {
		right.push({
			text: 'snap',
			style: accent,
			action: { id: 'view.toggle-snap' },
			id: 'status.snap',
		})
	}
	if (editor.getInstanceState().isToolLocked) {
		right.push({
			text: 'lock',
			style: accent,
			action: { id: 'view.toggle-tool-lock' },
			id: 'status.lock',
		})
	}
	if (ui.debug.get() && ctx.debugStats) {
		const s = ctx.debugStats
		right.push({
			text: `${s.fps}fps ${s.frameMs.toFixed(1)}ms ${s.bytes}B ${s.inputToWriteMs.toFixed(1)}ms`,
			style: muted,
		})
	}
	let rightWidth = 0
	for (const seg of right) rightWidth += stringWidth(seg.text) + 2
	rightWidth -= 1
	let rx = cols - rightWidth
	if (rx < 0) rx = 0
	let cx = rx
	for (const seg of right) {
		const w = screen.text(cx, row, seg.text, seg.style, cols - cx)
		if (seg.action && seg.id) {
			regions.push({ id: seg.id, rect: { x: cx, y: row, w, h: 1 }, action: seg.action })
		}
		cx += w + 2
	}
	const available = Math.max(0, rx - 2)

	const error = ui.error.get()
	if (error && error.until > ctx.now) {
		const text = fitText(`! ${error.message}`, available, glyphs.ellipsis)
		screen.text(1, row, text, { fg: pal.danger, bg: pal.bg, bold: true })
		return
	}

	const left: Segment[] = []
	let tool = getActiveToolLabel(editor)
	if (editor.getEditingShapeId()) tool += ' (editing)'
	left.push({ text: tool, style: base })
	left.push({ text: `${Math.round(editor.getZoomLevel() * 100)}%`, style: base })
	const selected = editor.getSelectedShapeIds().length
	if (selected > 0) left.push({ text: `${selected} selected`, style: base })
	const latches = ui.latches.get()
	const rich = glyphs.tier === 'rich'
	// Sticky latches (toggled twice) are drawn inverse so a held modifier is visibly different.
	const sticky: CellStyle = { ...accent, inverse: true }
	if (latches.shift)
		left.push({ text: rich ? '⇧' : 'shift', style: latches.stickyShift ? sticky : accent })
	if (latches.alt)
		left.push({ text: rich ? '⌥' : 'alt', style: latches.stickyAlt ? sticky : accent })
	if (latches.ctrl)
		left.push({ text: rich ? '⌃' : 'ctrl', style: latches.stickyCtrl ? sticky : accent })
	if (ui.pointerMode.get()) {
		left.push({ text: ui.pointerButtonDown.get() ? '[DRAG]' : '[PTR]', style: accent })
	}
	if (cols >= COORDS_MIN_COLS && ui.pointerCell.get()) {
		const p = editor.inputs.getCurrentPagePoint()
		left.push({ text: `${Math.round(p.x)},${Math.round(p.y)}`, style: muted })
	}
	const hint = statusHint(ctx)
	if (hint && (cols >= HINT_MIN_COLS || hint.firstRun)) {
		left.push({ text: asciiSafe(glyphs, hint.text), style: muted })
	}

	// Drop segments from the right until the left side fits; the first one is truncated instead.
	let count = left.length
	let width = segmentsWidth(left, count)
	while (count > 1 && width > available) {
		count--
		width = segmentsWidth(left, count)
	}
	let x = 1
	for (let i = 0; i < count; i++) {
		const seg = left[i]
		const remaining = available - (x - 1)
		if (remaining <= 0) break
		const text = i === 0 ? fitText(seg.text, remaining, glyphs.ellipsis) : seg.text
		x += screen.text(x, row, text, seg.style, remaining)
		if (i < count - 1 && x + 3 <= available + 1) {
			screen.text(x + 1, row, glyphs.bullet, muted)
			x += 3
		}
	}
}

function segmentsWidth(segments: readonly Segment[], count: number): number {
	let w = 0
	for (let i = 0; i < count; i++) w += stringWidth(segments[i].text) + (i > 0 ? 3 : 0)
	return w
}

interface StatusHint {
	text: string
	firstRun: boolean
}

/** Hover hint, then the first-run hint, then the full text of a single selected shape. */
function statusHint(ctx: ChromeContext): StatusHint | null {
	const hint = ctx.ui.hint.get()
	if (hint) return { text: hint, firstRun: false }
	if (!ctx.ui.firstKeySeen.get()) return { text: FIRST_RUN_HINT, firstRun: true }
	const shape = ctx.editor.getOnlySelectedShape()
	if (shape) {
		const text = getShapePlaintext(ctx.editor, shape)
		if (text) return { text: text.replace(/\s*\n\s*/g, ' / '), firstRun: false }
	}
	return null
}

interface PromptLayout {
	/** Column where the value starts. */
	x: number
	/** Cells of the value hidden on the left so the caret stays on screen. */
	scroll: number
	caretOffset: number
}

/** A value longer than the row scrolls so the caret is always visible (an ellipsis marks the cut). */
function layoutPrompt(prompt: PromptState, cols: number): PromptLayout {
	const x = 1 + stringWidth(promptLabelText(prompt)) + 1
	const caretOffset = stringWidth(graphemes(prompt.value).slice(0, prompt.caret).join(''))
	const available = Math.max(1, cols - 1 - x)
	const scroll = caretOffset >= available ? caretOffset - available + 1 : 0
	return { x, scroll, caretOffset }
}

/** Terminal cell of the prompt caret, for placing the real cursor (IME, blink). */
export function getPromptCaretCell(
	layout: ChromeLayout,
	prompt: PromptState
): { col: number; row: number } {
	const { x, scroll, caretOffset } = layoutPrompt(prompt, layout.cols)
	return { col: Math.min(layout.cols - 1, x + caretOffset - scroll), row: layout.statusRow }
}

function renderPrompt(
	screen: Screen,
	row: number,
	cols: number,
	prompt: PromptState,
	ctx: ChromeContext,
	pal: ChromePalette
) {
	const label = promptLabelText(prompt)
	let x = 1
	x += screen.text(x, row, label, { fg: pal.accent, bg: pal.bg, bold: true }, cols - x)
	if (prompt.spec.kind === 'confirm') return
	x += 1
	const { scroll } = layoutPrompt(prompt, cols)
	const parts = graphemes(prompt.value)
	const base: CellStyle = { fg: pal.text, bg: pal.bg }
	let skipped = 0
	let i = 0
	// Drop whole graphemes from the left until the hidden width is reached, then mark the cut.
	while (i < parts.length && skipped < scroll) skipped += stringWidth(parts[i++])
	if (scroll > 0 && x < cols) {
		screen.put(x, row, ctx.glyphs.ellipsis, { fg: pal.muted, bg: pal.bg })
		x += 1
	}
	for (; i < parts.length && x < cols; i++) {
		const caret = i === prompt.caret
		screen.text(x, row, parts[i], caret ? { ...base, inverse: true } : base, cols - x)
		x += stringWidth(parts[i])
	}
	if (prompt.caret >= parts.length && x < cols) {
		screen.put(x, row, ' ', { ...base, inverse: true })
		x += 1
	}
	if (prompt.completions.length > 1 && x + 4 < cols) {
		x += 2
		const names = prompt.completions.map((c) => {
			const slash = c.lastIndexOf('/', c.length - 2)
			return slash >= 0 ? c.slice(slash + 1) : c
		})
		screen.text(x, row, fitText(names.join('  '), cols - x - 1, ctx.glyphs.ellipsis), {
			fg: pal.muted,
			bg: pal.bg,
		})
	}
}

function renderDockedStylePanel(
	screen: Screen,
	rect: Rect,
	ctx: ChromeContext,
	pal: ChromePalette,
	regions: HotRegion[]
) {
	const { editor, glyphs } = ctx
	screen.fillRect(rect, ' ', { fg: pal.text, bg: pal.bg })
	const border = glyphs.boxLight[5]
	for (let y = rect.y; y < rect.y + rect.h; y++)
		screen.put(rect.x, y, border, { fg: pal.border, bg: pal.bg })
	screen.text(rect.x + 2, rect.y, 'Style', { fg: pal.muted, bg: pal.bg, bold: true }, rect.w - 2)
	const rows = buildStyleRows(editor)
	const maxLines = Math.max(0, rect.h - 1)
	// Two lines per row (full label, then the value) when they fit, else one truncated line each.
	const twoLines = rows.length * 2 <= maxLines
	const layout = layoutStyleRows(rows, {
		x: rect.x + 2,
		y: rect.y + 1,
		innerWidth: rect.w - 2,
		maxLines,
		labelWidth: twoLines ? rect.w - 2 : DOCKED_LABEL_WIDTH,
		forceCycle: true,
		lineHeight: twoLines ? 2 : 1,
		glyphs,
	})
	for (const line of layout) {
		drawStyleRow(screen, line, false, ctx, pal)
		for (const cell of line.cells) {
			const step = cell.step < 0 ? -1 : 1
			regions.push({
				id: `style.${line.row.id}.${step < 0 ? 'prev' : 'next'}`,
				rect: { x: cell.x, y: line.cellsY, w: cell.w, h: 1 },
				onPress: () => stepStyleValue(editor, line.row, step),
				hint: `${line.row.label}: ${line.row.current ?? 'mixed'}`,
			})
		}
	}
}

function drawStyleRow(
	screen: Screen,
	line: StyleRowLayout,
	focused: boolean,
	ctx: ChromeContext,
	pal: ChromePalette
) {
	const { glyphs, editor } = ctx
	const row = line.row
	screen.text(
		line.labelX,
		line.y,
		fitText(row.label, line.labelWidth, glyphs.ellipsis),
		focused ? { fg: pal.accent, bg: pal.bg, bold: true } : { fg: pal.muted, bg: pal.bg },
		line.labelWidth
	)
	const base: CellStyle = { fg: pal.text, bg: pal.bg }
	if (line.mode === 'inline') {
		for (const cell of line.cells) {
			if (row.isColor) {
				const color = swatchColor(editor, cell.value ?? '')
				screen.text(cell.x, line.cellsY, glyphs.blockFull.repeat(SWATCH_WIDTH), {
					fg: color,
					bg: pal.bg,
				})
				if (cell.selected) {
					screen.put(cell.x - 1, line.cellsY, '[', { fg: pal.text, bg: pal.bg, bold: true })
					screen.put(cell.x + cell.w, line.cellsY, ']', { fg: pal.text, bg: pal.bg, bold: true })
				}
			} else {
				screen.text(
					cell.x,
					line.cellsY,
					cell.display,
					cell.selected ? { fg: pal.onAccent, bg: pal.accent, bold: true } : base
				)
			}
		}
		return
	}
	const [prev, value, next] = line.cells
	const arrow: CellStyle = { fg: pal.accent, bg: pal.bg }
	screen.put(prev.x, line.cellsY, prev.display, arrow)
	screen.put(next.x, line.cellsY, next.display, arrow)
	let text = value.display
	let x = value.x
	let width = value.w
	if (row.isColor && row.current !== null && width > SWATCH_WIDTH + 1) {
		screen.text(x, line.cellsY, glyphs.blockFull.repeat(SWATCH_WIDTH), {
			fg: swatchColor(editor, row.current),
			bg: pal.bg,
		})
		x += SWATCH_WIDTH + 1
		width -= SWATCH_WIDTH + 1
	}
	text = fitText(text, width, glyphs.ellipsis)
	screen.text(
		x,
		line.cellsY,
		text,
		row.current === null ? { fg: pal.muted, bg: pal.bg } : base,
		width
	)
}

function drawBox(
	screen: Screen,
	rect: Rect,
	glyphs: GlyphSet,
	pal: ChromePalette,
	title: string | null
) {
	screen.fillRect(rect, ' ', { fg: pal.text, bg: pal.bg })
	const b = glyphs.boxLight
	const style: CellStyle = { fg: pal.border, bg: pal.bg }
	const right = rect.x + rect.w - 1
	const bottom = rect.y + rect.h - 1
	for (let x = rect.x + 1; x < right; x++) {
		screen.put(x, rect.y, b[10], style)
		screen.put(x, bottom, b[10], style)
	}
	for (let y = rect.y + 1; y < bottom; y++) {
		screen.put(rect.x, y, b[5], style)
		screen.put(right, y, b[5], style)
	}
	screen.put(rect.x, rect.y, b[6], style)
	screen.put(right, rect.y, b[12], style)
	screen.put(rect.x, bottom, b[3], style)
	screen.put(right, bottom, b[9], style)
	if (title && rect.w > 6) {
		screen.text(rect.x + 2, rect.y, ` ${fitText(title, rect.w - 6, glyphs.ellipsis)} `, {
			fg: pal.text,
			bg: pal.bg,
			bold: true,
		})
	}
}

function drawList(
	screen: Screen,
	list: ListBox,
	glyphs: GlyphSet,
	pal: ChromePalette,
	title: string | null
) {
	drawBox(screen, list.rect, glyphs, pal, title)
	const b = glyphs.boxLight
	const innerX = list.rect.x + 1
	const innerW = list.rect.w - 2
	const right = list.rect.x + list.rect.w - 1
	for (let i = 0; i < list.visible; i++) {
		const index = list.scroll + i
		const item = list.items[index]
		if (!item) break
		const y = list.rect.y + 1 + i
		if (item.separator) {
			screen.put(list.rect.x, y, b[7], { fg: pal.border, bg: pal.bg })
			for (let x = innerX; x < right; x++) screen.put(x, y, b[10], { fg: pal.border, bg: pal.bg })
			screen.put(right, y, b[13], { fg: pal.border, bg: pal.bg })
			continue
		}
		const selected = index === list.selected
		const style: CellStyle = selected
			? { fg: pal.onAccent, bg: pal.accent, bold: true, dim: !item.enabled }
			: { fg: item.enabled ? pal.text : pal.muted, bg: pal.bg, dim: !item.enabled }
		screen.fillRect({ x: innerX, y, w: innerW, h: 1 }, ' ', style)
		let x = innerX + 1
		if (list.hasChecks) {
			if (item.checked) screen.put(x, y, glyphs.check, style)
			x += 2
		}
		screen.text(x, y, asciiSafe(glyphs, item.label), style, innerW - 2)
		if (item.kbd) {
			const kx = right - 1 - stringWidth(item.kbd) - (item.submenu ? 2 : 0)
			screen.text(kx, y, item.kbd, selected ? style : { ...style, fg: pal.muted })
		}
		if (item.submenu) screen.put(right - 2, y, glyphs.caretRight, style)
	}
	drawScrollMarks(
		screen,
		list.rect,
		list.scroll > 0,
		list.scroll + list.visible < list.items.length,
		glyphs,
		pal
	)
}

function drawScrollMarks(
	screen: Screen,
	rect: Rect,
	up: boolean,
	down: boolean,
	glyphs: GlyphSet,
	pal: ChromePalette
) {
	const x = rect.x + rect.w - 1
	const style: CellStyle = { fg: pal.accent, bg: pal.bg }
	if (up) screen.put(x, rect.y + 1, glyphs.caretUp, style)
	if (down) screen.put(x, rect.y + rect.h - 2, glyphs.caretDown, style)
}

function renderPopup(
	screen: Screen,
	layout: ChromeLayout,
	ctx: ChromeContext,
	pal: ChromePalette,
	popup: PopupState
) {
	const { glyphs } = ctx
	const model: PopupModel = buildPopupModel(popup, {
		cols: layout.cols,
		rows: layout.rows,
		editor: ctx.editor,
		ui: ctx.ui,
		encoding: ctx.ui.keyboardEncoding.get(),
		env: ctx.env ?? process.env,
		glyphs,
	})
	switch (model.kind) {
		case 'menu': {
			const bar = model.menubar
			screen.fillRect({ x: 0, y: bar.row, w: layout.cols, h: 1 }, ' ', { fg: pal.text, bg: pal.bg })
			for (const entry of bar.entries) {
				const active = entry.id === bar.active
				screen.text(
					entry.x - 1,
					bar.row,
					` ${entry.label} `,
					active ? { fg: pal.onAccent, bg: pal.accent, bold: true } : { fg: pal.text, bg: pal.bg }
				)
			}
			drawList(screen, model.list, glyphs, pal, null)
			if (model.submenu) drawList(screen, model.submenu, glyphs, pal, null)
			return
		}
		case 'context':
		case 'geo':
		case 'pages':
			drawList(screen, model.list, glyphs, pal, model.title)
			return
		case 'help': {
			const rect = model.rect
			drawBox(
				screen,
				rect,
				glyphs,
				pal,
				asciiSafe(glyphs, `${model.title} · ${encodingLabel(ctx.ui.keyboardEncoding.get())}`)
			)
			for (let i = 0; i < model.tabs.length; i++) {
				const tab = model.tabs[i]
				const active = i === model.tab
				screen.text(
					tab.x,
					model.tabRow,
					` ${tab.label} `,
					active ? { fg: pal.onAccent, bg: pal.accent, bold: true } : { fg: pal.muted, bg: pal.bg }
				)
			}
			const innerX = rect.x + 2
			const innerW = rect.w - 4
			for (let i = 0; i < model.visible; i++) {
				const line = model.lines[model.scroll + i]
				if (!line) break
				const y = model.tabRow + 1 + i
				if (line.heading) {
					screen.text(innerX, y, line.text, { fg: pal.accent, bg: pal.bg, bold: true }, innerW)
					continue
				}
				const kbdW = stringWidth(line.kbd)
				const text = asciiSafe(glyphs, line.text)
				screen.text(innerX, y, fitText(text, innerW - kbdW - 1, glyphs.ellipsis), {
					fg: pal.text,
					bg: pal.bg,
				})
				if (kbdW > 0) {
					screen.text(innerX + innerW - kbdW, y, line.kbd, {
						fg: line.kbd === 'menu' ? pal.muted : pal.text,
						bg: pal.bg,
						bold: line.kbd !== 'menu',
					})
				}
			}
			for (let i = 0; i < model.footer.length; i++) {
				const y = rect.y + rect.h - 1 - model.footer.length + i
				screen.text(
					innerX,
					y,
					fitText(asciiSafe(glyphs, model.footer[i]), innerW, glyphs.ellipsis),
					{
						fg: pal.muted,
						bg: pal.bg,
					}
				)
			}
			drawScrollMarks(
				screen,
				{ x: rect.x, y: rect.y, w: rect.w, h: rect.h - model.footer.length },
				model.scroll > 0,
				model.scroll + model.visible < model.lines.length,
				glyphs,
				pal
			)
			return
		}
		case 'style': {
			drawBox(screen, model.rect, glyphs, pal, 'Style')
			for (let i = 0; i < model.layout.length; i++) {
				drawStyleRow(screen, model.layout[i], i === model.focused, ctx, pal)
			}
			return
		}
		case 'prompt':
			return
	}
}
