import { ACTION_META, type ActionId } from '../actions/actionIds'
import { actionKbd } from './menus'

export type KeyboardEncoding = 'legacy' | 'full'

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
	/** Empty when the action is only reachable from a menu in this encoding. */
	kbd: string
	heading?: boolean
}

/** Explicit entries; `undefined` kbd means "show the action's shortcut for the active encoding". */
type Spec = ActionId | { label: string; kbd?: string; heading?: boolean }

const MENU_ONLY = 'menu'

function heading(label: string): Spec {
	return { label, heading: true }
}

const TOOLS: readonly Spec[] = [
	heading('Tools'),
	'tool.select',
	'tool.hand',
	{ label: 'Draw', kbd: 'd, b, x' },
	'tool.eraser',
	'tool.arrow',
	'tool.line',
	'tool.text',
	'tool.note',
	'tool.frame',
	'tool.rectangle',
	'tool.ellipse',
	{ label: 'Shape picker (again: cycle shapes)', kbd: 'g' },
	'tool.laser',
	'tool.highlight',
	heading('Held keys'),
	'modifier.toggle-shift',
	'modifier.toggle-alt',
	'modifier.toggle-ctrl',
	{ label: 'Press a latch twice to keep it held', kbd: '' },
	heading('Keyboard pointer'),
	'view.toggle-pointer-mode',
	{ label: 'Move the pointer (shift latch: 5 cells)', kbd: 'arrows' },
	{ label: 'Press or release the button', kbd: 'space' },
	{ label: 'Click', kbd: 'enter' },
	{ label: 'Jump to the next shape', kbd: 'tab' },
]

const EDIT: readonly Spec[] = [
	heading('History'),
	'edit.undo',
	'edit.redo',
	heading('Selection'),
	'edit.cut',
	'edit.copy',
	'edit.paste',
	'edit.duplicate',
	'edit.delete',
	'edit.select-all',
	{ label: 'Deselect or cancel', kbd: 'esc' },
	'edit.edit-text',
	{ label: 'Finish editing text', kbd: 'esc, alt+enter' },
	'edit.toggle-group',
	'edit.toggle-lock',
	{ label: 'Nudge (shift latch: 10×)', kbd: 'arrows' },
	heading('Arrange'),
	'arrange.align-left',
	'arrange.align-center-horizontal',
	'arrange.align-right',
	'arrange.align-top',
	'arrange.align-center-vertical',
	'arrange.align-bottom',
	'arrange.distribute-horizontal',
	'arrange.distribute-vertical',
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
	heading('Panels'),
	'ui.style-panel',
	'ui.menu',
	'ui.context-menu',
	'ui.help',
	heading('Pages'),
	'page.prev',
	'page.next',
	'page.rename',
	'ui.pages',
]

const FILE: readonly Spec[] = [
	heading('File'),
	'file.new',
	'file.open',
	'file.save',
	'file.save-as',
	'file.export-text',
	'app.quit',
	{ label: 'Quit (twice, with nothing selected)', kbd: 'ctrl+c' },
	heading('Prompts'),
	{ label: 'Complete a path', kbd: 'tab' },
	{ label: 'Previous or next entry', kbd: 'up, down' },
	{ label: 'Home directory', kbd: '~/' },
]

const MOUSE: readonly Spec[] = [
	heading('Mouse'),
	{ label: 'Draw, select or move', kbd: 'left drag' },
	{ label: 'Context menu', kbd: 'right click' },
	{ label: 'Pan', kbd: 'right or middle drag' },
	{ label: 'Scroll the canvas', kbd: 'wheel' },
	{ label: 'Zoom around the pointer', kbd: 'ctrl+wheel, alt+wheel' },
	{ label: 'Edit text', kbd: 'double click' },
	{ label: 'Resize or rotate', kbd: 'drag a handle' },
	{ label: 'Constrain, add to selection, clone', kbd: 'F5, F6, F7 then drag' },
	heading('Toolbar and panels'),
	{ label: 'Choose a tool or style value', kbd: 'click' },
	{ label: 'Step a docked style value', kbd: 'click the arrows' },
]

const TAB_SPECS: Readonly<Record<HelpTab['id'], readonly Spec[]>> = {
	tools: TOOLS,
	edit: EDIT,
	view: VIEW,
	file: FILE,
	mouse: MOUSE,
}

/** Entries for a tab, with shortcuts chosen for the active keyboard encoding. */
export function helpEntries(tab: HelpTab['id'], encoding: KeyboardEncoding): HelpEntry[] {
	const out: HelpEntry[] = []
	for (const spec of TAB_SPECS[tab]) {
		if (typeof spec === 'string') {
			const kbd = actionKbd(spec, encoding)
			out.push({ label: ACTION_META[spec].label, kbd: kbd ?? MENU_ONLY })
		} else if (spec.heading) {
			out.push({ label: spec.label, kbd: '', heading: true })
		} else {
			out.push({ label: spec.label, kbd: spec.kbd ?? '' })
		}
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
