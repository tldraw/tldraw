import type { Editor, TLKeyboardEventInfo } from '@tldraw/editor'
import type { KeyEvent } from '../terminal/InputParser'
import type { Latches, ModifierName, UiState } from '../ui/UiState'

export interface ModifierFlags {
	shift: boolean
	alt: boolean
	ctrl: boolean
}

export const NO_MODIFIERS: Readonly<ModifierFlags> = { shift: false, alt: false, ctrl: false }

const MODIFIER_NAMES: readonly ModifierName[] = ['shift', 'alt', 'ctrl']

interface ModifierKeyInfo {
	key: string
	code: string
}

/**
 * Key and code of the synthesized events. `Control`/`ControlLeft` is what Editor.ts:10781 and
 * :11479 normalise to; packages/driver's `CtrlLeft` would never leave `inputs.keys`.
 */
const KEY_INFO: Readonly<Record<ModifierName, ModifierKeyInfo>> = {
	shift: { key: 'Shift', code: 'ShiftLeft' },
	alt: { key: 'Alt', code: 'AltLeft' },
	ctrl: { key: 'Control', code: 'ControlLeft' },
}

function modifierNameOfKey(key: string): ModifierName | null {
	switch (key) {
		case 'Shift':
			return 'shift'
		case 'Alt':
			return 'alt'
		case 'Control':
			return 'ctrl'
		default:
			return null
	}
}

function stickyKey(name: ModifierName): keyof Latches {
	return name === 'shift' ? 'stickyShift' : name === 'alt' ? 'stickyAlt' : 'stickyCtrl'
}

/**
 * Keeps the editor's idea of held modifiers in step with what the terminal can tell us.
 *
 * Terminals report no key releases and strip shift from mouse reports, and tldraw releases a
 * modifier 150 ms after any event that lacks its bit (Editor.ts:10994-11017), so the effective
 * flags of every pointer and wheel event are the OR of the UI latches (F5/F6/F7), modifier keys
 * held under the kitty protocol, and the event's own bits. Changes against the previous event
 * are dispatched as synthesized `key_down`/`key_up` built like `Driver.getKeyboardEventInfo`
 * (packages/driver/src/lib/Driver.ts:267-291) so `inputs.keys` and tool key handlers see holds.
 */
export class ModifierTracker {
	private readonly held: ModifierFlags = { shift: false, alt: false, ctrl: false }
	private readonly synced: ModifierFlags = { shift: false, alt: false, ctrl: false }

	constructor(
		private readonly editor: Editor,
		private readonly ui: UiState
	) {}

	/** Modifier keys currently held under the kitty protocol. */
	getHeld(): Readonly<ModifierFlags> {
		return this.held
	}

	/** What the editor was last told; tests read this. */
	getSynced(): Readonly<ModifierFlags> {
		return this.synced
	}

	/** Effective flags for an event carrying its own bits; written into `out` to avoid allocation. */
	effective(shift: boolean, alt: boolean, ctrl: boolean, out: ModifierFlags): ModifierFlags {
		const latches = this.ui.latches.get()
		out.shift = shift || latches.shift || this.held.shift
		out.alt = alt || latches.alt || this.held.alt
		out.ctrl = ctrl || latches.ctrl || this.held.ctrl
		return out
	}

	/** Latches plus held keys only, for keyboard-driven events and after a pointer up. */
	current(out: ModifierFlags): ModifierFlags {
		return this.effective(false, false, false, out)
	}

	/**
	 * Dispatches synthesized modifier key events for every flag that differs from the last call.
	 * Call right before a pointer or wheel event so the hold is in place when the tool sees it.
	 */
	sync(mods: Readonly<ModifierFlags>): void {
		const { synced } = this
		if (synced.shift === mods.shift && synced.alt === mods.alt && synced.ctrl === mods.ctrl) return
		// Releases first: a key_up reports the modifiers still held, which is the new state.
		for (const name of MODIFIER_NAMES) {
			if (synced[name] && !mods[name]) {
				synced[name] = false
				this.editor.dispatch(this.keyEvent('key_up', name))
			}
		}
		for (const name of MODIFIER_NAMES) {
			if (!synced[name] && mods[name]) {
				synced[name] = true
				this.editor.dispatch(this.keyEvent('key_down', name))
			}
		}
	}

	/**
	 * A real Shift/Alt/Control press or release (only kitty-style terminals send these). It drives
	 * the latch badge like F5–F7 would; a release returns the latch to its sticky state.
	 * Returns false for every other key.
	 */
	handleModifierKey(event: KeyEvent): boolean {
		const name = modifierNameOfKey(event.key)
		if (name === null) return event.key === 'Meta'
		if (event.repeat && !event.release) return true
		this.held[name] = !event.release
		const latches = this.ui.latches.get()
		const value = event.release ? latches[stickyKey(name)] : true
		if (latches[name] !== value) this.ui.latches.set({ ...latches, [name]: value })
		return true
	}

	/** Focus out: nothing is held any more and the editor must agree. */
	releaseAll(): void {
		this.held.shift = false
		this.held.alt = false
		this.held.ctrl = false
		this.ui.clearLatches()
		this.sync(NO_MODIFIERS)
	}

	private keyEvent(name: 'key_down' | 'key_up', modifier: ModifierName): TLKeyboardEventInfo {
		const info = KEY_INFO[modifier]
		const { synced } = this
		return {
			type: 'keyboard',
			name,
			key: info.key,
			code: info.code,
			shiftKey: synced.shift,
			altKey: synced.alt,
			ctrlKey: synced.ctrl,
			metaKey: false,
			accelKey: synced.ctrl,
		}
	}
}
