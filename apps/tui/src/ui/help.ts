import { ACTION_META, type ActionId } from '../actions/actionIds'
import {
	bindingsForAction,
	parseChord,
	type KeyboardEncoding,
	type KeyChord,
} from '../input/keymap'

export type { KeyboardEncoding } from '../input/keymap'

export interface HelpTab {
	id: 'tools' | 'edit' | 'view' | 'file' | 'mouse'
	label: string
}

export const HELP_TABS: readonly HelpTab[] = [
	{ id: 'tools', label: 'Tools' },
	{ id: 'edit', label: 'Edit' },
	{ id: 'view', label: 'View' },
	{ id: 'file', label: 'File' },
	{ id: 'mouse', label: 'Mouse' },
]

export interface HelpEntry {
	label: string
	/** Empty for headings and notes; `menu` when the action has no shortcut in this encoding. */
	kbd: string
	heading?: boolean
	/** Set when the line describes an action, so tests can check coverage. */
	action?: ActionId
}

interface SpecEntry {
	action?: ActionId
	/** Replaces the action's `ACTION_META` label. */
	label?: string
	/** Fixed text instead of the shortcuts derived from the keymap. */
	kbd?: string
	/** Fixed text with full keys (defaults to `kbd`). */
	kbdFull?: string
	heading?: boolean
	/** Leave the line out when the action has no shortcut in this encoding. */
	ifBound?: boolean
}

type Spec = ActionId | SpecEntry

const MENU_ONLY = 'menu'

/**
 * Keys the input controller handles outside the shortcut table (keymap.ts PRIMARY_EXCLUDED): Enter is
 * forwarded to the select tool, which starts editing, and Escape becomes `editor.cancel()`.
 */
const CONTROLLER_ROUTED: ReadonlySet<ActionId> = new Set<ActionId>([
	'edit.edit-text',
	'edit.select-none',
])

const KEY_DISPLAY: Readonly<Record<string, string>> = {
	Escape: 'esc',
	Enter: 'enter',
	Tab: 'tab',
	' ': 'space',
	Delete: 'del',
	Backspace: 'backspace',
	Insert: 'insert',
	Home: 'home',
	End: 'end',
	PageUp: 'pgup',
	PageDown: 'pgdn',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	ArrowUp: 'up',
	ArrowDown: 'down',
}

/** Shifted punctuation that reads better as the character the terminal sends (`?`, not `shift+/`). */
const SHIFTED_DISPLAY: Readonly<Record<string, string>> = {
	'=': '+',
	'-': '_',
	'[': '{',
	']': '}',
	"'": '"',
	'/': '?',
}

/** The inverse of `parseChord`: `ctrl+shift+z`, `alt+left`, `shift+1`, `?`, `F5`. */
export function formatChord(chord: KeyChord): string {
	const parts: string[] = []
	if (chord.ctrl) parts.push('ctrl')
	if (chord.alt) parts.push('alt')
	let key = KEY_DISPLAY[chord.key] ?? chord.key
	let shift = chord.shift
	const shifted = SHIFTED_DISPLAY[chord.key]
	if (shift && shifted !== undefined && !chord.ctrl && !chord.alt) {
		key = shifted
		shift = false
	}
	if (shift) parts.push('shift')
	parts.push(key)
	return parts.join('+')
}

function chordKey(chord: KeyChord): string {
	return `${chord.key}|${chord.shift ? 's' : ''}${chord.ctrl ? 'c' : ''}${chord.alt ? 'a' : ''}`
}

/**
 * The shortcuts the keymap binds to an action, in binding order, so the overlay cannot drift from
 * what the keys do. With full keys the tldraw chord replaces its legacy stand-in (the menus show
 * the same); other aliases stay.
 */
export function actionShortcuts(id: ActionId, encoding: KeyboardEncoding): string[] {
	const seen = new Set<string>()
	const chords: KeyChord[] = []
	for (const chord of bindingsForAction(id, encoding)) {
		const key = chordKey(chord)
		if (seen.has(key)) continue
		seen.add(key)
		chords.push(chord)
	}
	const meta = ACTION_META[id]
	if (encoding === 'full' && meta.kbd && meta.kbdFull && chords.length > 1) {
		const full = chordKey(parseChord(meta.kbdFull))
		const legacy = chordKey(parseChord(meta.kbd))
		if (seen.has(full)) return chords.filter((c) => chordKey(c) !== legacy).map(formatChord)
	}
	return chords.map(formatChord)
}

function heading(label: string): Spec {
	return { label, heading: true }
}

function note(label: string): Spec {
	return { label }
}

const TOOLS: readonly Spec[] = [
	heading('Tools'),
	'tool.select',
	'tool.hand',
	'tool.draw',
	'tool.eraser',
	'tool.arrow',
	'tool.line',
	'tool.text',
	'tool.note',
	'tool.frame',
	'tool.rectangle',
	'tool.ellipse',
	{ action: 'ui.geo-picker', label: 'Shape picker (again: next shape)' },
	'tool.laser',
	'tool.highlight',
	{ action: 'view.toggle-tool-lock', label: 'Tool lock (keep the tool after drawing)' },
	heading('Held modifiers'),
	'modifier.toggle-shift',
	'modifier.toggle-alt',
	'modifier.toggle-ctrl',
	note('Press a latch again to keep it held, a third time to release it'),
	heading('Keyboard pointer'),
	'view.toggle-pointer-mode',
	{ label: 'Move the pointer (shift latch: 5 cells)', kbd: 'arrows' },
	{ label: 'Press or release the button', kbd: 'space' },
	{ label: 'Click', kbd: 'enter' },
	{ label: 'Jump to the next or previous shape', kbd: 'tab, shift+tab' },
]

const EDIT: readonly Spec[] = [
	heading('History'),
	'edit.undo',
	'edit.redo',
	heading('Selection'),
	'edit.cut',
	'edit.copy',
	{ action: 'edit.paste', label: 'Paste (at the pointer with the shift latch)' },
	'edit.duplicate',
	'edit.delete',
	'edit.select-all',
	{ action: 'edit.select-none', label: 'Deselect, or cancel the current action' },
	'edit.edit-text',
	'edit.toggle-group',
	{ action: 'edit.ungroup', ifBound: true },
	'edit.toggle-lock',
	'edit.unlock-all',
	{ label: 'Nudge (shift or shift latch: 10×; grid on: one grid step)', kbd: 'arrows' },
	heading('Text editing'),
	{ label: 'New line (frame names: finish)', kbd: 'enter' },
	{ label: 'Finish editing', kbd: 'esc, alt+enter', kbdFull: 'esc, alt+enter, ctrl+enter' },
	{ label: 'Delete the previous word', kbd: 'ctrl+backspace' },
	{ label: 'Start or end of the line (ctrl: of the text)', kbd: 'home, end' },
	heading('Arrange'),
	'arrange.align-left',
	'arrange.align-center-horizontal',
	'arrange.align-right',
	'arrange.align-top',
	'arrange.align-center-vertical',
	'arrange.align-bottom',
	'arrange.distribute-horizontal',
	'arrange.distribute-vertical',
	'arrange.stretch-horizontal',
	'arrange.stretch-vertical',
	'arrange.pack',
	'arrange.stack-horizontal',
	'arrange.stack-vertical',
	'arrange.flip-horizontal',
	'arrange.flip-vertical',
	'arrange.rotate-cw',
	'arrange.rotate-ccw',
	'arrange.bring-to-front',
	'arrange.bring-forward',
	'arrange.send-backward',
	'arrange.send-to-back',
]

const VIEW: readonly Spec[] = [
	heading('Camera'),
	'view.zoom-in',
	'view.zoom-out',
	'view.zoom-to-fit',
	'view.zoom-to-selection',
	'view.zoom-to-100',
	heading('Canvas'),
	'view.toggle-grid',
	'view.toggle-snap',
	'view.toggle-dark-mode',
	'view.toggle-debug',
	heading('Panels'),
	'ui.style-panel',
	'ui.menu',
	'ui.context-menu',
	'ui.help',
	note('Menus: left/right switch, up/down move, enter chooses, letters jump'),
	note('Help: left/right or 1–5 switch tabs, up/down scroll, q closes'),
	heading('Pages'),
	'page.prev',
	'page.next',
	'page.rename',
	'ui.pages',
	'page.new',
	'page.duplicate',
	'page.delete',
]

const FILE: readonly Spec[] = [
	heading('File'),
	'file.new',
	'file.open',
	'file.save',
	'file.save-as',
	'file.export-text',
	'app.quit',
	{ label: 'Quit when nothing is selected (press twice)', kbd: 'ctrl+c' },
	heading('Prompts'),
	{ label: 'Complete a path (again: next match)', kbd: 'tab' },
	{ label: 'Earlier or later answers', kbd: 'up, down' },
	{ label: 'Start or end of the line', kbd: 'ctrl+a, ctrl+e' },
	{ label: 'Delete to the start, or the previous word', kbd: 'ctrl+u, ctrl+w' },
	{ label: 'Home directory', kbd: '~/' },
	{ label: 'Unsaved changes: save, discard, cancel', kbd: 'y, n, esc' },
]

const MOUSE: readonly Spec[] = [
	heading('Canvas'),
	{ label: 'Draw, select, brush or move', kbd: 'left drag' },
	{ label: 'Select a shape', kbd: 'left click' },
	{ label: 'Edit text (two clicks in the same cell)', kbd: 'double click' },
	{ label: 'Context menu (press and release in one cell)', kbd: 'right click' },
	{ label: 'Pan', kbd: 'right or middle drag, wheel' },
	{ label: 'Scroll sideways', kbd: 'shift+wheel' },
	{ label: 'Zoom around the pointer', kbd: 'ctrl+wheel, alt+wheel' },
	heading('Handles'),
	{ label: 'Resize from a corner handle or along an edge', kbd: 'drag' },
	{ label: 'Rotate from one cell diagonally outside a corner', kbd: 'drag' },
	{ label: 'Move an arrow or line point', kbd: 'drag the dot' },
	{ label: 'Constrain, add to the selection or clone', kbd: 'F5, F6, F7, then drag' },
	heading('Toolbar and panels'),
	{ label: 'Choose a tool, undo, redo, menu, help', kbd: 'click the toolbar' },
	{ label: 'Change a style', kbd: 'click a value or an arrow' },
	{ label: 'Turn grid or snap off', kbd: 'click the status bar' },
]

const TAB_SPECS: Readonly<Record<HelpTab['id'], readonly Spec[]>> = {
	tools: TOOLS,
	edit: EDIT,
	view: VIEW,
	file: FILE,
	mouse: MOUSE,
}

/** Entries for a tab, with shortcuts taken from the keymap for the active keyboard encoding. */
export function helpEntries(tab: HelpTab['id'], encoding: KeyboardEncoding): HelpEntry[] {
	const out: HelpEntry[] = []
	for (const spec of TAB_SPECS[tab]) {
		const entry: SpecEntry = typeof spec === 'string' ? { action: spec } : spec
		if (entry.heading) {
			out.push({ label: entry.label ?? '', kbd: '', heading: true })
			continue
		}
		let kbd = encoding === 'full' ? (entry.kbdFull ?? entry.kbd) : entry.kbd
		if (entry.action === undefined) {
			out.push({ label: entry.label ?? '', kbd: kbd ?? '' })
			continue
		}
		if (kbd === undefined) {
			const shortcuts = actionShortcuts(entry.action, encoding)
			if (shortcuts.length > 0) kbd = shortcuts.join(', ')
			else if (entry.ifBound) continue
			else if (CONTROLLER_ROUTED.has(entry.action)) kbd = ACTION_META[entry.action].kbd ?? MENU_ONLY
			else kbd = MENU_ONLY
		}
		out.push({ label: entry.label ?? ACTION_META[entry.action].label, kbd, action: entry.action })
	}
	return out
}

export function encodingLabel(encoding: KeyboardEncoding): string {
	return encoding === 'full' ? 'full keys' : 'legacy keys'
}

/**
 * Terminal-specific advice shown under the shortcuts. tmux delays a lone Escape by its
 * `escape-time` (500 ms by default); macOS terminals send Option as a composed character unless
 * "Option as Meta" is on, which makes every alt chord unreachable.
 */
export function terminalHints(env: NodeJS.ProcessEnv): string[] {
	const hints: string[] = []
	if (env.TMUX) hints.push('tmux: run "set -s escape-time 10" so esc is not delayed')
	const program = env.TERM_PROGRAM
	if (program === 'Apple_Terminal' || program === 'iTerm.app') {
		hints.push('macOS: enable "Use Option as Meta key" for alt shortcuts; menus work without it')
	}
	return hints
}
