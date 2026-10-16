import type { Editor } from '@tldraw/editor'
import { GeoShapeGeoStyle } from '@tldraw/tlschema'
import type { ActionInvocation } from '../actions/actionIds'
import type { AppContext, HotRegion, PopupController, PopupResult } from '../app/context'
import type { GlyphSet } from '../terminal/chars'
import type { KeyEvent, MouseEvent, TerminalEvent } from '../terminal/InputParser'
import type { Rect } from '../terminal/Screen'
import { stringWidth } from '../terminal/width'
import {
	HELP_TABS,
	helpEntries,
	terminalHints,
	type HelpEntry,
	type KeyboardEncoding,
} from './help'
import {
	MENU_IDS,
	MENU_LABELS,
	contextMenuItems,
	isMenuItemEnabled,
	menuItemKbd,
	menuItemLabel,
	menuItems,
	type MenuItem,
} from './menus'
import {
	PromptHistory,
	createPromptState,
	promptBackspace,
	promptCaretToEnd,
	promptCaretToStart,
	promptComplete,
	promptDeleteForward,
	promptDeleteToStart,
	promptDeleteWord,
	promptInsert,
	promptMoveCaret,
} from './prompt'
import {
	applyStyleValue,
	buildStyleRows,
	findStyleRowByKey,
	stepStyleValue,
	type StyleRow,
} from './stylePanel'
import type { MenuId, PopupState, PromptSpec, PromptState, UiState } from './UiState'

export interface ListItem {
	label: string
	kbd: string | undefined
	action: ActionInvocation | undefined
	enabled: boolean
	separator: boolean
	checked: boolean
	submenu: readonly MenuItem[] | null
	hint: string | undefined
}

/** A bordered list: `rect` includes the border, item `i` sits on row `rect.y + 1 + i - scroll`. */
export interface ListBox {
	rect: Rect
	items: ListItem[]
	selected: number
	scroll: number
	visible: number
	hasChecks: boolean
	labelWidth: number
	kbdWidth: number
}

export interface MenubarEntry {
	id: MenuId
	label: string
	x: number
	w: number
}

export interface MenubarModel {
	row: number
	entries: MenubarEntry[]
	active: MenuId
}

export interface HelpLine {
	text: string
	kbd: string
	heading: boolean
}

export interface StyleCell {
	x: number
	w: number
	/** The value this cell applies, or null for a step arrow. */
	value: string | null
	display: string
	step: -1 | 1 | 0
	selected: boolean
}

export interface StyleRowLayout {
	row: StyleRow
	/** Row of the label. */
	y: number
	/** Row of the value cells: `y` for one-line rows, `y + 1` for the two-line docked layout. */
	cellsY: number
	labelX: number
	labelWidth: number
	mode: 'inline' | 'cycle'
	cells: StyleCell[]
}

export type PopupModel =
	| { kind: 'menu'; rect: Rect; menubar: MenubarModel; list: ListBox; submenu: ListBox | null }
	| { kind: 'context' | 'geo' | 'pages'; rect: Rect; list: ListBox; title: string | null }
	| {
			kind: 'help'
			rect: Rect
			tab: number
			title: string
			lines: HelpLine[]
			scroll: number
			visible: number
			footer: string[]
			tabRow: number
			tabs: Array<{ x: number; w: number; label: string }>
	  }
	| { kind: 'style'; rect: Rect; rows: StyleRow[]; focused: number; layout: StyleRowLayout[] }
	| { kind: 'prompt'; rect: Rect; state: PromptState }

export interface PopupModelContext {
	cols: number
	rows: number
	editor: Editor
	/** Needed for the check marks of UI toggles; null when only geometry is wanted. */
	ui: UiState | null
	encoding: KeyboardEncoding
	env: NodeJS.ProcessEnv
	glyphs: GlyphSet
}

export const MENUBAR_ROW = 1
const HELP_MAX_HEIGHT = 32
const HELP_MAX_WIDTH = 76
const STYLE_MAX_WIDTH = 76
const STYLE_MIN_WIDTH = 44
/** Docked panel: fixed label column so the value column lines up (18 - 2 border/pad). */
export const DOCKED_LABEL_WIDTH = 5
export const SWATCH_WIDTH = 2

function listItemsFrom(
	entries: readonly MenuItem[],
	editor: Editor,
	ui: UiState | null,
	encoding: KeyboardEncoding
): ListItem[] {
	const out: ListItem[] = []
	for (const entry of entries) {
		if (entry.separator) {
			out.push({
				label: '',
				kbd: undefined,
				action: undefined,
				enabled: false,
				separator: true,
				checked: false,
				submenu: null,
				hint: undefined,
			})
			continue
		}
		out.push({
			label: menuItemLabel(entry),
			kbd: menuItemKbd(entry, encoding),
			action: entry.action,
			enabled: isMenuItemEnabled(entry, editor),
			separator: false,
			checked: entry.checked && ui ? entry.checked(editor, ui) : false,
			submenu: entry.submenu ?? null,
			hint: entry.hint,
		})
	}
	return out
}

/** Separators carry no selection; everything else (even disabled items) can be focused. */
export function firstSelectable(items: readonly ListItem[], from = 0): number {
	for (let i = Math.max(0, from); i < items.length; i++) if (!items[i].separator) return i
	for (let i = 0; i < from && i < items.length; i++) if (!items[i].separator) return i
	return -1
}

export function stepSelection(items: readonly ListItem[], from: number, delta: number): number {
	const n = items.length
	if (n === 0) return -1
	let i = from
	for (let tries = 0; tries < n; tries++) {
		i = (((i + delta) % n) + n) % n
		if (!items[i].separator) return i
	}
	return from
}

function measureList(items: readonly ListItem[]) {
	let labelWidth = 0
	let kbdWidth = 0
	let hasChecks = false
	let hasSubmenu = false
	for (const item of items) {
		labelWidth = Math.max(labelWidth, stringWidth(item.label))
		if (item.kbd) kbdWidth = Math.max(kbdWidth, stringWidth(item.kbd))
		if (item.checked) hasChecks = true
		if (item.submenu) hasSubmenu = true
	}
	const innerWidth =
		1 +
		(hasChecks ? 2 : 0) +
		labelWidth +
		(kbdWidth > 0 ? 2 + kbdWidth : 0) +
		(hasSubmenu ? 2 : 0) +
		1
	return { labelWidth, kbdWidth, hasChecks, innerWidth }
}

/**
 * Places a list of `items` as a box whose top-left wants to be at (x, y), clamped so the whole
 * box stays over the canvas (rows 1 … rows-2) and inside the columns; long lists scroll.
 */
function placeList(
	items: ListItem[],
	selected: number,
	x: number,
	y: number,
	cols: number,
	rows: number,
	center: boolean,
	minWidth = 0
): ListBox {
	const { labelWidth, kbdWidth, hasChecks, innerWidth } = measureList(items)
	const maxH = Math.max(3, rows - 2)
	const w = Math.min(cols, Math.max(minWidth, innerWidth) + 2)
	const visible = Math.max(1, Math.min(items.length, maxH - 2))
	const h = visible + 2
	let px = x
	let py = y
	if (center) {
		px = Math.floor((cols - w) / 2)
		py = 1 + Math.floor((rows - 2 - h) / 2)
	}
	px = Math.max(0, Math.min(cols - w, px))
	py = Math.max(1, Math.min(rows - 1 - h, py))
	const scroll = selected < visible ? 0 : Math.min(selected - visible + 1, items.length - visible)
	return {
		rect: { x: px, y: py, w, h },
		items,
		selected,
		scroll: Math.max(0, scroll),
		visible,
		hasChecks,
		labelWidth,
		kbdWidth,
	}
}

export function buildMenubar(cols: number, active: MenuId): MenubarModel {
	const entries: MenubarEntry[] = []
	let x = 1
	for (const id of MENU_IDS) {
		const label = MENU_LABELS[id]
		const w = stringWidth(label) + 2
		if (x + w > cols) break
		entries.push({ id, label, x, w })
		x += w
	}
	return { row: MENUBAR_ROW, entries, active }
}

function buildMenuModel(
	popup: Extract<PopupState, { kind: 'menu' }>,
	mc: PopupModelContext
): PopupModel {
	const menubar = buildMenubar(mc.cols, popup.menu)
	const entry = menubar.entries.find((e) => e.id === popup.menu)
	const items = listItemsFrom(menuItems(popup.menu, mc.editor), mc.editor, mc.ui, mc.encoding)
	const selected = items[popup.index] ? popup.index : firstSelectable(items)
	const list = placeList(
		items,
		selected,
		entry ? entry.x - 1 : 0,
		MENUBAR_ROW + 1,
		mc.cols,
		mc.rows,
		false
	)
	let submenu: ListBox | null = null
	if (popup.submenu !== null) {
		const parentIndex = items.findIndex((item) => item.submenu && item.label === popup.submenu)
		const parent = parentIndex >= 0 ? items[parentIndex] : null
		if (parent && parent.submenu) {
			const subItems = listItemsFrom(parent.submenu, mc.editor, mc.ui, mc.encoding)
			const subSelected = subItems[popup.submenuIndex]
				? popup.submenuIndex
				: firstSelectable(subItems)
			const parentRow = list.rect.y + 1 + parentIndex - list.scroll
			const { innerWidth } = measureList(subItems)
			const subW = innerWidth + 2
			let sx = list.rect.x + list.rect.w
			if (sx + subW > mc.cols) sx = list.rect.x - subW
			submenu = placeList(subItems, subSelected, sx, parentRow - 1, mc.cols, mc.rows, false)
		}
	}
	return { kind: 'menu', rect: list.rect, menubar, list, submenu }
}

function geoItems(editor: Editor): ListItem[] {
	const current = editor.getStyleForNextShape(GeoShapeGeoStyle)
	return GeoShapeGeoStyle.values.map((geo) => ({
		label: geo,
		kbd: undefined,
		action: { id: 'tool.geo', arg: geo },
		enabled: true,
		separator: false,
		checked: geo === current,
		submenu: null,
		hint: undefined,
	}))
}

function pagesPopupItems(mc: PopupModelContext): ListItem[] {
	const entries = menuItems('pages', mc.editor)
	return listItemsFrom(entries, mc.editor, mc.ui, mc.encoding)
}

function buildHelpModel(
	popup: Extract<PopupState, { kind: 'help' }>,
	mc: PopupModelContext
): PopupModel {
	const w = Math.min(mc.cols, HELP_MAX_WIDTH)
	const h = Math.max(5, Math.min(mc.rows - 2, HELP_MAX_HEIGHT))
	const x = Math.floor((mc.cols - w) / 2)
	const y = 1 + Math.floor((mc.rows - 2 - h) / 2)
	const tabIndex = Math.max(0, Math.min(HELP_TABS.length - 1, popup.tab))
	const lines = helpEntries(HELP_TABS[tabIndex].id, mc.encoding).map(entryToLine)
	const footer = terminalHints(mc.env)
	const visible = Math.max(1, h - 3 - footer.length)
	const scroll = Math.max(0, Math.min(popup.scroll, Math.max(0, lines.length - visible)))
	const tabs: Array<{ x: number; w: number; label: string }> = []
	let tx = x + 2
	for (const tab of HELP_TABS) {
		const tw = stringWidth(tab.label) + 2
		tabs.push({ x: tx, w: tw, label: tab.label })
		tx += tw
	}
	return {
		kind: 'help',
		rect: { x, y, w, h },
		tab: tabIndex,
		title: 'Keyboard shortcuts',
		lines,
		scroll,
		visible,
		footer,
		tabRow: y + 1,
		tabs,
	}
}

function entryToLine(entry: HelpEntry): HelpLine {
	return { text: entry.label, kbd: entry.kbd, heading: entry.heading === true }
}

export interface StyleLayoutOptions {
	x: number
	y: number
	innerWidth: number
	/** Lines available; rows that do not fit are left out. */
	maxLines: number
	labelWidth: number
	/** Docked panel: always `◄value►`, never the inline cells. */
	forceCycle: boolean
	/** 2 puts the value cells on their own line under a full-width label (narrow docked panel). */
	lineHeight?: 1 | 2
	glyphs: GlyphSet
}

function inlineWidth(row: StyleRow): number {
	if (row.isColor) return row.values.length * (SWATCH_WIDTH + 1) + 1
	let w = 0
	for (const d of row.display) w += stringWidth(d) + 1
	return w
}

/** Lays out style rows one per line: label, then either every value as a cell or `◄ value ►`. */
export function layoutStyleRows(
	rows: readonly StyleRow[],
	opts: StyleLayoutOptions
): StyleRowLayout[] {
	const out: StyleRowLayout[] = []
	const lineHeight = opts.lineHeight ?? 1
	const valuesX = lineHeight === 2 ? opts.x + 1 : opts.x + opts.labelWidth + 1
	const valuesW = lineHeight === 2 ? opts.innerWidth - 1 : opts.innerWidth - opts.labelWidth - 1
	for (let i = 0; i < rows.length && (i + 1) * lineHeight <= opts.maxLines; i++) {
		const row = rows[i]
		const y = opts.y + i * lineHeight
		const cellsY = y + lineHeight - 1
		const cells: StyleCell[] = []
		if (!opts.forceCycle && inlineWidth(row) <= valuesW) {
			let x = valuesX + (row.isColor ? 1 : 0)
			for (let k = 0; k < row.values.length; k++) {
				const display = row.isColor ? row.values[k] : row.display[k]
				const w = row.isColor ? SWATCH_WIDTH : stringWidth(display)
				cells.push({
					x,
					w,
					value: row.values[k],
					display,
					step: 0,
					selected: row.current === row.values[k],
				})
				x += w + 1
			}
			out.push({
				row,
				y,
				cellsY,
				labelX: opts.x,
				labelWidth: opts.labelWidth,
				mode: 'inline',
				cells,
			})
			continue
		}
		// `◄value►`: the arrows hug the value so a 16-cell docked panel still fits `██ black`. In a
		// wide popup the cell shrinks to the longest value so the right arrow stays next to it.
		let valueW = Math.max(1, valuesW - 2)
		if (!opts.forceCycle) {
			let widest = stringWidth('mixed')
			for (const d of row.display) widest = Math.max(widest, stringWidth(d))
			valueW = Math.min(valueW, widest + (row.isColor ? SWATCH_WIDTH + 1 : 0))
		}
		const index = row.current === null ? -1 : row.values.indexOf(row.current)
		const display = index < 0 ? 'mixed' : row.display[index]
		cells.push({
			x: valuesX,
			w: 1,
			value: null,
			display: opts.glyphs.caretLeft,
			step: -1,
			selected: false,
		})
		cells.push({ x: valuesX + 1, w: valueW, value: null, display, step: 1, selected: index >= 0 })
		cells.push({
			x: valuesX + 1 + valueW,
			w: 1,
			value: null,
			display: opts.glyphs.caretRight,
			step: 1,
			selected: false,
		})
		out.push({ row, y, cellsY, labelX: opts.x, labelWidth: opts.labelWidth, mode: 'cycle', cells })
	}
	return out
}

function buildStyleModel(
	popup: Extract<PopupState, { kind: 'style' }>,
	mc: PopupModelContext
): PopupModel {
	const rows = buildStyleRows(mc.editor)
	let labelWidth = 0
	let widest = 0
	for (const row of rows) {
		labelWidth = Math.max(labelWidth, stringWidth(row.label))
		widest = Math.max(widest, inlineWidth(row))
	}
	const innerWidth = Math.min(
		Math.max(2, mc.cols - 2),
		Math.max(STYLE_MIN_WIDTH, Math.min(STYLE_MAX_WIDTH, labelWidth + 1 + widest + 2))
	)
	const maxLines = Math.max(1, mc.rows - 4)
	const h = Math.min(rows.length, maxLines) + 2
	const w = innerWidth + 2
	const x = Math.floor((mc.cols - w) / 2)
	const y = Math.max(1, 1 + Math.floor((mc.rows - 2 - h) / 2))
	const focused = Math.max(0, Math.min(rows.length - 1, popup.row))
	const layout = layoutStyleRows(rows, {
		x: x + 1,
		y: y + 1,
		innerWidth,
		maxLines,
		labelWidth,
		forceCycle: false,
		glyphs: mc.glyphs,
	})
	return { kind: 'style', rect: { x, y, w, h }, rows, focused, layout }
}

export function buildPopupModel(popup: PopupState, mc: PopupModelContext): PopupModel {
	switch (popup.kind) {
		case 'menu':
			return buildMenuModel(popup, mc)
		case 'context': {
			const items = listItemsFrom(contextMenuItems(mc.editor), mc.editor, mc.ui, mc.encoding)
			const selected = items[popup.index] ? popup.index : firstSelectable(items)
			const list = placeList(items, selected, popup.col, popup.row, mc.cols, mc.rows, false)
			return { kind: 'context', rect: list.rect, list, title: null }
		}
		case 'geo': {
			const items = geoItems(mc.editor)
			const selected = items[popup.index] ? popup.index : 0
			const list = placeList(items, selected, 0, 0, mc.cols, mc.rows, true, 16)
			return { kind: 'geo', rect: list.rect, list, title: 'Shape' }
		}
		case 'pages': {
			const items = pagesPopupItems(mc)
			const selected = items[popup.index] ? popup.index : firstSelectable(items)
			const list = placeList(items, selected, 0, 0, mc.cols, mc.rows, true, 20)
			return { kind: 'pages', rect: list.rect, list, title: 'Pages' }
		}
		case 'help':
			return buildHelpModel(popup, mc)
		case 'style':
			return buildStyleModel(popup, mc)
		case 'prompt':
			return {
				kind: 'prompt',
				rect: { x: 0, y: mc.rows - 1, w: mc.cols, h: 1 },
				state: popup.prompt,
			}
	}
}

/** The rectangle `layoutChrome` reports for the open popup. */
export function popupRect(
	popup: PopupState,
	cols: number,
	rows: number,
	editor: Editor,
	encoding: KeyboardEncoding,
	glyphs: GlyphSet
): Rect {
	return buildPopupModel(popup, { cols, rows, editor, ui: null, encoding, env: {}, glyphs }).rect
}

export function rectContains(rect: Rect, col: number, row: number): boolean {
	return col >= rect.x && col < rect.x + rect.w && row >= rect.y && row < rect.y + rect.h
}

/** Index of the item under a cell, or -1 (borders and separators count as nothing). */
export function hitListItem(list: ListBox, col: number, row: number): number {
	if (!rectContains(list.rect, col, row)) return -1
	if (col === list.rect.x || col === list.rect.x + list.rect.w - 1) return -1
	const index = row - list.rect.y - 1 + list.scroll
	if (index < list.scroll || index >= list.scroll + list.visible) return -1
	const item = list.items[index]
	if (!item || item.separator) return -1
	return index
}

export function hitMenubar(menubar: MenubarModel, col: number, row: number): MenuId | null {
	if (row !== menubar.row) return null
	for (const entry of menubar.entries) {
		if (col >= entry.x - 1 && col < entry.x + entry.w - 1) return entry.id
	}
	return null
}

export function hitStyleCell(
	layout: readonly StyleRowLayout[],
	col: number,
	row: number
): { rowIndex: number; cell: StyleCell } | null {
	for (let i = 0; i < layout.length; i++) {
		const r = layout[i]
		if (r.cellsY !== row) continue
		for (const cell of r.cells) {
			if (col >= cell.x && col < cell.x + cell.w) return { rowIndex: i, cell }
		}
		return null
	}
	return null
}

const CONSUMED: PopupResult = { consumed: true }
const NOT_CONSUMED: PopupResult = { consumed: false }

function isPrintable(event: KeyEvent): string | null {
	if (event.ctrl || event.alt || event.meta) return null
	if (event.text !== undefined && event.text.length > 0) return event.text
	if (event.key.length === 1 && event.key !== ' ') return event.key
	return null
}

/** Letters, digits and punctuation that can jump to a menu item (space/enter activate instead). */
function jumpLetter(event: KeyEvent): string | null {
	const text = isPrintable(event)
	if (text === null || text.length !== 1) return null
	return text.toLowerCase()
}

class PopupControllerImpl implements PopupController {
	private readonly history = new PromptHistory()

	constructor(private readonly ctx: AppContext) {}

	private modelContext(): PopupModelContext {
		const layout = this.ctx.getLayout()
		return {
			cols: layout.cols,
			rows: layout.rows,
			editor: this.ctx.editor,
			ui: this.ctx.ui,
			encoding: this.ctx.ui.keyboardEncoding.get(),
			env: this.ctx.env,
			glyphs: this.ctx.glyphs,
		}
	}

	private model(popup: PopupState): PopupModel {
		return buildPopupModel(popup, this.modelContext())
	}

	handleInput(event: TerminalEvent): PopupResult {
		const popup = this.ctx.ui.popup.get()
		if (!popup) return this.handleDockedPanel(event)
		switch (event.type) {
			case 'key':
				if (event.release) return CONSUMED
				return this.handleKey(popup, event)
			case 'mouse':
				return this.handleMouse(popup, event)
			case 'paste':
				if (popup.kind === 'prompt' && popup.prompt.spec.kind !== 'confirm') {
					this.setPrompt(promptInsert(popup.prompt, event.text))
				}
				return CONSUMED
			default:
				return NOT_CONSUMED
		}
	}

	/** Without a popup only the docked style panel is ours: its value cells are hot regions. */
	private handleDockedPanel(event: TerminalEvent): PopupResult {
		if (event.type !== 'mouse') return NOT_CONSUMED
		const panel = this.ctx.getLayout().stylePanel
		if (!panel || !rectContains(panel, event.col, event.row)) return NOT_CONSUMED
		if (event.action === 'move') return NOT_CONSUMED
		if (event.action === 'down' && event.button === 0) {
			const region = findHotRegion(this.ctx.getHotRegions(), 'style.', event.col, event.row)
			if (region?.onPress) region.onPress(event)
		}
		return CONSUMED
	}

	private handleKey(popup: PopupState, event: KeyEvent): PopupResult {
		switch (popup.kind) {
			case 'menu':
				return this.handleMenuKey(popup, event)
			case 'context':
			case 'geo':
			case 'pages':
				return this.handleListKey(popup, event)
			case 'help':
				return this.handleHelpKey(popup, event)
			case 'style':
				return this.handleStyleKey(popup, event)
			case 'prompt':
				return this.handlePromptKey(popup, event)
		}
	}

	private handleMenuKey(
		popup: Extract<PopupState, { kind: 'menu' }>,
		event: KeyEvent
	): PopupResult {
		const model = this.model(popup)
		if (model.kind !== 'menu') return CONSUMED
		const inSub = model.submenu !== null
		const list = inSub ? model.submenu! : model.list
		switch (event.key) {
			case 'Escape':
				if (inSub) this.set({ ...popup, submenu: null })
				else this.closeAll()
				return CONSUMED
			case 'ArrowLeft':
				if (inSub) this.set({ ...popup, submenu: null })
				else this.switchMenu(popup, -1)
				return CONSUMED
			case 'ArrowRight':
			case 'Tab':
				if (!inSub && model.list.items[model.list.selected]?.submenu) {
					this.openSubmenu(popup, model.list)
				} else if (!inSub) {
					this.switchMenu(popup, event.key === 'Tab' && event.shift ? -1 : 1)
				}
				return CONSUMED
			case 'ArrowUp':
			case 'ArrowDown': {
				const next = stepSelection(list.items, list.selected, event.key === 'ArrowUp' ? -1 : 1)
				this.set(inSub ? { ...popup, submenuIndex: next } : { ...popup, index: next })
				return CONSUMED
			}
			case 'Home':
			case 'End': {
				const next =
					event.key === 'Home' ? firstSelectable(list.items) : stepSelection(list.items, 0, -1)
				this.set(inSub ? { ...popup, submenuIndex: next } : { ...popup, index: next })
				return CONSUMED
			}
			case 'Enter':
			case ' ':
				return this.activateMenuItem(popup, model, inSub, list.selected)
		}
		const letter = jumpLetter(event)
		if (letter !== null) {
			const jump = findByLetter(list.items, list.selected, letter)
			if (jump.index >= 0) {
				if (jump.unique) return this.activateMenuItem(popup, model, inSub, jump.index)
				this.set(inSub ? { ...popup, submenuIndex: jump.index } : { ...popup, index: jump.index })
			}
		}
		return CONSUMED
	}

	private switchMenu(popup: Extract<PopupState, { kind: 'menu' }>, delta: number) {
		const i = MENU_IDS.indexOf(popup.menu)
		const n = MENU_IDS.length
		const menu = MENU_IDS[(((i + delta) % n) + n) % n]
		this.set({ kind: 'menu', menu, index: 0, submenu: null, submenuIndex: 0 })
	}

	private openSubmenu(popup: Extract<PopupState, { kind: 'menu' }>, list: ListBox) {
		const item = list.items[list.selected]
		if (!item?.submenu) return
		this.set({ ...popup, index: list.selected, submenu: item.label, submenuIndex: 0 })
	}

	private activateMenuItem(
		popup: Extract<PopupState, { kind: 'menu' }>,
		model: Extract<PopupModel, { kind: 'menu' }>,
		inSub: boolean,
		index: number
	): PopupResult {
		const list = inSub ? model.submenu! : model.list
		const item = list.items[index]
		if (!item || item.separator) return CONSUMED
		if (!inSub && item.submenu) {
			if (item.enabled) this.set({ ...popup, index, submenu: item.label, submenuIndex: 0 })
			return CONSUMED
		}
		return this.chooseItem(item)
	}

	/** Closes the popup and hands the item's action back; disabled items only consume the key. */
	private chooseItem(item: ListItem): PopupResult {
		if (!item.enabled) return CONSUMED
		this.closeAll()
		if (item.action) return { consumed: true, action: item.action }
		if (item.hint) this.ctx.ui.setHint(item.hint)
		return CONSUMED
	}

	private handleListKey(
		popup: Extract<PopupState, { kind: 'context' | 'geo' | 'pages' }>,
		event: KeyEvent
	): PopupResult {
		const model = this.model(popup)
		if (model.kind !== popup.kind) return CONSUMED
		const list = model.list
		switch (event.key) {
			case 'Escape':
				this.closeAll()
				return CONSUMED
			case 'ArrowUp':
			case 'ArrowDown':
				this.set({
					...popup,
					index: stepSelection(list.items, list.selected, event.key === 'ArrowUp' ? -1 : 1),
				})
				return CONSUMED
			case 'PageUp':
			case 'PageDown': {
				const delta = event.key === 'PageUp' ? -list.visible : list.visible
				const target = Math.max(0, Math.min(list.items.length - 1, list.selected + delta))
				const index = list.items[target].separator
					? stepSelection(list.items, target, delta < 0 ? -1 : 1)
					: target
				this.set({ ...popup, index })
				return CONSUMED
			}
			case 'Home':
				this.set({ ...popup, index: firstSelectable(list.items) })
				return CONSUMED
			case 'End':
				this.set({ ...popup, index: stepSelection(list.items, 0, -1) })
				return CONSUMED
			case 'Enter':
			case ' ':
				return this.chooseItem(list.items[list.selected])
		}
		const letter = jumpLetter(event)
		if (letter !== null) {
			const jump = findByLetter(list.items, list.selected, letter)
			if (jump.index >= 0) {
				if (jump.unique) return this.chooseItem(list.items[jump.index])
				this.set({ ...popup, index: jump.index })
			}
		}
		return CONSUMED
	}

	private handleHelpKey(
		popup: Extract<PopupState, { kind: 'help' }>,
		event: KeyEvent
	): PopupResult {
		const model = this.model(popup)
		if (model.kind !== 'help') return CONSUMED
		const maxScroll = Math.max(0, model.lines.length - model.visible)
		const n = HELP_TABS.length
		switch (event.key) {
			case 'Escape':
			case 'Enter':
			case 'q':
			case '?':
			case 'F1':
				this.closeAll()
				return CONSUMED
			case 'ArrowLeft':
				this.set({ kind: 'help', tab: (model.tab + n - 1) % n, scroll: 0 })
				return CONSUMED
			case 'ArrowRight':
			case 'Tab':
				this.set({ kind: 'help', tab: (model.tab + (event.shift ? n - 1 : 1)) % n, scroll: 0 })
				return CONSUMED
			case 'ArrowUp':
				this.set({ ...popup, scroll: Math.max(0, model.scroll - 1) })
				return CONSUMED
			case 'ArrowDown':
				this.set({ ...popup, scroll: Math.min(maxScroll, model.scroll + 1) })
				return CONSUMED
			case 'PageUp':
				this.set({ ...popup, scroll: Math.max(0, model.scroll - model.visible) })
				return CONSUMED
			case 'PageDown':
			case ' ':
				this.set({ ...popup, scroll: Math.min(maxScroll, model.scroll + model.visible) })
				return CONSUMED
			case 'Home':
				this.set({ ...popup, scroll: 0 })
				return CONSUMED
			case 'End':
				this.set({ ...popup, scroll: maxScroll })
				return CONSUMED
		}
		const digit = Number(event.key)
		if (event.key.length === 1 && digit >= 1 && digit <= n) {
			this.set({ kind: 'help', tab: digit - 1, scroll: 0 })
		}
		return CONSUMED
	}

	private handleStyleKey(
		popup: Extract<PopupState, { kind: 'style' }>,
		event: KeyEvent
	): PopupResult {
		const model = this.model(popup)
		if (model.kind !== 'style') return CONSUMED
		const rows = model.rows
		if (rows.length === 0) {
			this.closeAll()
			return CONSUMED
		}
		const focused = model.focused
		switch (event.key) {
			case 'Escape':
			case 'Enter':
				this.closeAll()
				return CONSUMED
			case 'ArrowUp':
				this.set({ kind: 'style', row: (focused + rows.length - 1) % rows.length })
				return CONSUMED
			case 'ArrowDown':
			case 'Tab':
				this.set({ kind: 'style', row: (focused + 1) % rows.length })
				return CONSUMED
			case 'Home':
				this.set({ kind: 'style', row: 0 })
				return CONSUMED
			case 'End':
				this.set({ kind: 'style', row: rows.length - 1 })
				return CONSUMED
			case 'ArrowLeft':
				stepStyleValue(this.ctx.editor, rows[focused], -1)
				return CONSUMED
			case 'ArrowRight':
			case ' ':
				stepStyleValue(this.ctx.editor, rows[focused], 1)
				return CONSUMED
		}
		const text = isPrintable(event)
		if (text !== null) {
			const index = findStyleRowByKey(rows, text)
			if (index >= 0) this.set({ kind: 'style', row: index })
		}
		return CONSUMED
	}

	private handlePromptKey(
		popup: Extract<PopupState, { kind: 'prompt' }>,
		event: KeyEvent
	): PopupResult {
		const state = popup.prompt
		const spec = state.spec
		if (event.key === 'Escape') {
			this.closeAll()
			spec.onCancel?.()
			return CONSUMED
		}
		if (spec.kind === 'confirm') {
			const text = isPrintable(event)
			if (text !== null) {
				const choice = (spec.choices ?? []).find((c) => c.key.toLowerCase() === text.toLowerCase())
				if (choice) {
					this.closeAll()
					void spec.onSubmit(choice.key)
				}
			}
			return CONSUMED
		}
		switch (event.key) {
			case 'Enter': {
				this.closeAll()
				this.history.push(spec.label, state.value)
				void spec.onSubmit(state.value)
				return CONSUMED
			}
			case 'Tab':
				if (spec.kind === 'path') {
					this.setPrompt(promptComplete(state, { env: this.ctx.env, cwd: process.cwd() }))
				}
				return CONSUMED
			case 'ArrowUp':
				this.setPrompt(this.history.navigate(state, -1))
				return CONSUMED
			case 'ArrowDown':
				this.setPrompt(this.history.navigate(state, 1))
				return CONSUMED
			case 'ArrowLeft':
				this.setPrompt(promptMoveCaret(state, -1))
				return CONSUMED
			case 'ArrowRight':
				this.setPrompt(promptMoveCaret(state, 1))
				return CONSUMED
			case 'Home':
				this.setPrompt(promptCaretToStart(state))
				return CONSUMED
			case 'End':
				this.setPrompt(promptCaretToEnd(state))
				return CONSUMED
			case 'Backspace':
				this.setPrompt(event.ctrl || event.alt ? promptDeleteWord(state) : promptBackspace(state))
				return CONSUMED
			case 'Delete':
				this.setPrompt(promptDeleteForward(state))
				return CONSUMED
		}
		if (event.ctrl && !event.alt) {
			switch (event.key) {
				case 'a':
					this.setPrompt(promptCaretToStart(state))
					break
				case 'e':
					this.setPrompt(promptCaretToEnd(state))
					break
				case 'u':
					this.setPrompt(promptDeleteToStart(state))
					break
				case 'w':
					this.setPrompt(promptDeleteWord(state))
					break
			}
			return CONSUMED
		}
		const text = isPrintable(event) ?? (event.key === ' ' && !event.ctrl && !event.alt ? ' ' : null)
		if (text !== null) this.setPrompt(promptInsert(state, text))
		return CONSUMED
	}

	private handleMouse(popup: PopupState, event: MouseEvent): PopupResult {
		if (popup.kind === 'prompt') return CONSUMED
		const model = this.model(popup)
		if (event.action === 'wheel') return this.handleWheel(popup, model, event)
		if (event.action === 'move' || event.action === 'drag') {
			this.handleHover(popup, model, event)
			return CONSUMED
		}
		if (event.action !== 'down') return CONSUMED
		if (event.button !== 0) {
			if (!popupContains(model, event.col, event.row)) this.closeAll()
			return CONSUMED
		}
		switch (model.kind) {
			case 'menu': {
				const menu = hitMenubar(model.menubar, event.col, event.row)
				if (menu !== null) {
					// Clicking the open menu's own title closes it, like a desktop menubar.
					if (menu === model.menubar.active) this.closeAll()
					else this.set({ kind: 'menu', menu, index: 0, submenu: null, submenuIndex: 0 })
					return CONSUMED
				}
				if (model.submenu) {
					const sub = hitListItem(model.submenu, event.col, event.row)
					if (sub >= 0) return this.chooseItem(model.submenu.items[sub])
					if (rectContains(model.submenu.rect, event.col, event.row)) return CONSUMED
				}
				const index = hitListItem(model.list, event.col, event.row)
				if (index >= 0) {
					const menuPopup = popup as Extract<PopupState, { kind: 'menu' }>
					return this.activateMenuItem({ ...menuPopup, index }, model, false, index)
				}
				if (rectContains(model.list.rect, event.col, event.row)) return CONSUMED
				this.closeAll()
				return CONSUMED
			}
			case 'context':
			case 'geo':
			case 'pages': {
				const index = hitListItem(model.list, event.col, event.row)
				if (index >= 0) return this.chooseItem(model.list.items[index])
				if (!rectContains(model.list.rect, event.col, event.row)) this.closeAll()
				return CONSUMED
			}
			case 'help': {
				if (event.row === model.tabRow) {
					const tab = model.tabs.findIndex((t) => event.col >= t.x && event.col < t.x + t.w)
					if (tab >= 0) this.set({ kind: 'help', tab, scroll: 0 })
					return CONSUMED
				}
				if (!rectContains(model.rect, event.col, event.row)) this.closeAll()
				return CONSUMED
			}
			case 'style': {
				const hit = hitStyleCell(model.layout, event.col, event.row)
				if (hit) {
					const row = model.rows[hit.rowIndex]
					if (hit.cell.value !== null) applyStyleValue(this.ctx.editor, row, hit.cell.value)
					else stepStyleValue(this.ctx.editor, row, hit.cell.step === -1 ? -1 : 1)
					this.set({ kind: 'style', row: hit.rowIndex })
					return CONSUMED
				}
				if (!rectContains(model.rect, event.col, event.row)) this.closeAll()
				return CONSUMED
			}
			default:
				return CONSUMED
		}
	}

	private handleHover(popup: PopupState, model: PopupModel, event: MouseEvent) {
		switch (model.kind) {
			case 'menu': {
				const menuPopup = popup as Extract<PopupState, { kind: 'menu' }>
				const menu = hitMenubar(model.menubar, event.col, event.row)
				if (menu !== null && menu !== menuPopup.menu) {
					this.set({ kind: 'menu', menu, index: 0, submenu: null, submenuIndex: 0 })
					return
				}
				if (model.submenu) {
					const sub = hitListItem(model.submenu, event.col, event.row)
					if (sub >= 0 && sub !== menuPopup.submenuIndex)
						this.set({ ...menuPopup, submenuIndex: sub })
					if (sub >= 0) return
				}
				const index = hitListItem(model.list, event.col, event.row)
				if (index >= 0 && index !== menuPopup.index) {
					const item = model.list.items[index]
					this.set({
						...menuPopup,
						index,
						submenu: item.submenu && item.enabled ? item.label : null,
						submenuIndex: 0,
					})
				}
				return
			}
			case 'context':
			case 'geo':
			case 'pages': {
				const listPopup = popup as Extract<PopupState, { kind: 'context' | 'geo' | 'pages' }>
				const index = hitListItem(model.list, event.col, event.row)
				if (index >= 0 && index !== listPopup.index) this.set({ ...listPopup, index })
				return
			}
			case 'style': {
				const hit = hitStyleCell(model.layout, event.col, event.row)
				if (hit && hit.rowIndex !== model.focused) this.set({ kind: 'style', row: hit.rowIndex })
				return
			}
			default:
				return
		}
	}

	private handleWheel(popup: PopupState, model: PopupModel, event: MouseEvent): PopupResult {
		const delta = event.dy > 0 ? 1 : event.dy < 0 ? -1 : 0
		if (delta === 0) return CONSUMED
		switch (model.kind) {
			case 'help': {
				const maxScroll = Math.max(0, model.lines.length - model.visible)
				this.set({
					kind: 'help',
					tab: model.tab,
					scroll: Math.max(0, Math.min(maxScroll, model.scroll + delta * 3)),
				})
				return CONSUMED
			}
			case 'context':
			case 'geo':
			case 'pages': {
				const listPopup = popup as Extract<PopupState, { kind: 'context' | 'geo' | 'pages' }>
				this.set({
					...listPopup,
					index: stepSelection(model.list.items, model.list.selected, delta),
				})
				return CONSUMED
			}
			case 'menu': {
				const menuPopup = popup as Extract<PopupState, { kind: 'menu' }>
				if (model.submenu) {
					this.set({
						...menuPopup,
						submenuIndex: stepSelection(model.submenu.items, model.submenu.selected, delta),
					})
				} else {
					this.set({
						...menuPopup,
						index: stepSelection(model.list.items, model.list.selected, delta),
					})
				}
				return CONSUMED
			}
			case 'style':
				this.set({
					kind: 'style',
					row: (model.focused + delta + model.rows.length) % Math.max(1, model.rows.length),
				})
				return CONSUMED
			default:
				return CONSUMED
		}
	}

	private set(popup: PopupState) {
		this.ctx.ui.openPopup(popup)
	}

	private setPrompt(prompt: PromptState) {
		this.ctx.ui.openPopup({ kind: 'prompt', prompt })
	}

	private isOpen(kind: PopupState['kind']): boolean {
		return this.ctx.ui.popup.get()?.kind === kind
	}

	openMenu(menu: MenuId = 'file'): void {
		if (this.isOpen('menu')) {
			this.closeAll()
			return
		}
		const items = listItemsFrom(
			menuItems(menu, this.ctx.editor),
			this.ctx.editor,
			this.ctx.ui,
			'legacy'
		)
		this.set({ kind: 'menu', menu, index: firstSelectable(items), submenu: null, submenuIndex: 0 })
	}

	openContextMenu(col: number, row: number): void {
		const items = listItemsFrom(
			contextMenuItems(this.ctx.editor),
			this.ctx.editor,
			this.ctx.ui,
			'legacy'
		)
		this.set({ kind: 'context', col, row, index: firstSelectable(items) })
	}

	openStylePanel(): void {
		if (this.isOpen('style')) {
			this.closeAll()
			return
		}
		const rows = buildStyleRows(this.ctx.editor)
		if (rows.length === 0) {
			this.ctx.ui.setHint('Select a shape or a drawing tool to change styles')
			return
		}
		this.set({ kind: 'style', row: 0 })
	}

	openGeoPicker(): void {
		if (this.isOpen('geo')) {
			this.closeAll()
			return
		}
		const current = this.ctx.editor.getStyleForNextShape(GeoShapeGeoStyle)
		const index = Math.max(0, GeoShapeGeoStyle.values.indexOf(current))
		this.set({ kind: 'geo', index })
	}

	openPages(): void {
		if (this.isOpen('pages')) {
			this.closeAll()
			return
		}
		const editor = this.ctx.editor
		const index = Math.max(
			0,
			editor.getPages().findIndex((page) => page.id === editor.getCurrentPageId())
		)
		this.set({ kind: 'pages', index })
	}

	openHelp(): void {
		if (this.isOpen('help')) {
			this.closeAll()
			return
		}
		this.set({ kind: 'help', tab: 0, scroll: 0 })
	}

	prompt(spec: PromptSpec): void {
		this.setPrompt(createPromptState(spec))
	}

	closeAll(): void {
		this.ctx.ui.closePopup()
	}
}

function popupContains(model: PopupModel, col: number, row: number): boolean {
	if (rectContains(model.rect, col, row)) return true
	if (model.kind === 'menu') {
		if (row === model.menubar.row) return true
		if (model.submenu && rectContains(model.submenu.rect, col, row)) return true
	}
	return false
}

function findHotRegion(
	regions: readonly HotRegion[],
	idPrefix: string,
	col: number,
	row: number
): HotRegion | null {
	for (const region of regions) {
		if (region.id.startsWith(idPrefix) && rectContains(region.rect, col, row)) return region
	}
	return null
}

/** The next item after `from` whose label starts with `letter`; `unique` when it is the only one. */
export function findByLetter(
	items: readonly ListItem[],
	from: number,
	letter: string
): { index: number; unique: boolean } {
	const matches: number[] = []
	for (let i = 0; i < items.length; i++) {
		const item = items[i]
		if (item.separator || item.label.length === 0) continue
		if (item.label[0].toLowerCase() === letter) matches.push(i)
	}
	if (matches.length === 0) return { index: -1, unique: false }
	if (matches.length === 1) return { index: matches[0], unique: true }
	const after = matches.find((i) => i > from)
	return { index: after ?? matches[0], unique: false }
}

export function createPopupController(ctx: AppContext): PopupController {
	return new PopupControllerImpl(ctx)
}
