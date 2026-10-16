import type { TLEventInfo } from '@tldraw/editor'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { codeForKey, type KeyEvent } from '../terminal/InputParser'
import { createTestContext, type TestContext } from '../test/testContext'
import { ModifierTracker, NO_MODIFIERS, type ModifierFlags } from './modifiers'

function key(k: string, opts: Partial<Omit<KeyEvent, 'type' | 'key'>> = {}): KeyEvent {
	return {
		type: 'key',
		key: k,
		code: codeForKey(k),
		shift: false,
		ctrl: false,
		alt: false,
		meta: false,
		...opts,
	}
}

describe('ModifierTracker', () => {
	let ctx: TestContext
	let tracker: ModifierTracker
	let events: TLEventInfo[]
	const out: ModifierFlags = { shift: false, alt: false, ctrl: false }

	beforeEach(() => {
		ctx = createTestContext()
		tracker = new ModifierTracker(ctx.editor, ctx.ui)
		events = []
		ctx.editor.on('event', (info) => {
			if (info.type === 'keyboard') events.push(info)
		})
	})

	afterEach(() => ctx.dispose())

	it('ORs latches, held keys and event bits', () => {
		expect(tracker.effective(false, false, false, out)).toEqual(NO_MODIFIERS)
		ctx.ui.toggleLatch('shift')
		expect(tracker.effective(false, false, false, out)).toEqual({
			shift: true,
			alt: false,
			ctrl: false,
		})
		expect(tracker.effective(false, true, false, out)).toEqual({
			shift: true,
			alt: true,
			ctrl: false,
		})
		tracker.handleModifierKey(key('Control'))
		expect(tracker.current(out)).toEqual({ shift: true, alt: false, ctrl: true })
	})

	it('dispatches synthesized modifier key events on change only', () => {
		tracker.sync({ shift: true, alt: false, ctrl: false })
		expect(events).toHaveLength(1)
		expect(events[0]).toMatchObject({
			type: 'keyboard',
			name: 'key_down',
			key: 'Shift',
			code: 'ShiftLeft',
			shiftKey: true,
			ctrlKey: false,
			altKey: false,
			metaKey: false,
			accelKey: false,
		})
		expect(ctx.editor.inputs.getShiftKey()).toBe(true)
		expect(ctx.editor.inputs.keys.has('ShiftLeft')).toBe(true)

		tracker.sync({ shift: true, alt: false, ctrl: false })
		expect(events).toHaveLength(1)

		tracker.sync({ shift: false, alt: true, ctrl: true })
		expect(
			events.slice(1).map((e) => `${(e as { name: string }).name}:${(e as { code: string }).code}`)
		).toEqual(['key_up:ShiftLeft', 'key_down:AltLeft', 'key_down:ControlLeft'])
		expect(events[1]).toMatchObject({ shiftKey: false })
		expect(events[3]).toMatchObject({ altKey: true, ctrlKey: true, accelKey: true })
		expect(ctx.editor.inputs.keys.has('ShiftLeft')).toBe(false)
		expect(ctx.editor.inputs.keys.has('AltLeft')).toBe(true)
		expect(ctx.editor.inputs.keys.has('ControlLeft')).toBe(true)
		expect(tracker.getSynced()).toEqual({ shift: false, alt: true, ctrl: true })
	})

	it('drives the latch badge from real modifier key presses and releases', () => {
		expect(tracker.handleModifierKey(key('a'))).toBe(false)
		expect(tracker.handleModifierKey(key('Shift'))).toBe(true)
		expect(tracker.getHeld().shift).toBe(true)
		expect(ctx.ui.latches.get().shift).toBe(true)
		expect(tracker.handleModifierKey(key('Shift', { release: true }))).toBe(true)
		expect(tracker.getHeld().shift).toBe(false)
		expect(ctx.ui.latches.get().shift).toBe(false)

		// A sticky latch survives a real press and release.
		ctx.ui.toggleLatch('alt')
		ctx.ui.toggleLatch('alt')
		tracker.handleModifierKey(key('Alt'))
		tracker.handleModifierKey(key('Alt', { release: true }))
		expect(ctx.ui.latches.get().alt).toBe(true)
		expect(ctx.ui.latches.get().stickyAlt).toBe(true)
	})

	it('releaseAll clears held keys, latches and the editor state', () => {
		ctx.ui.toggleLatch('shift')
		tracker.handleModifierKey(key('Control'))
		tracker.sync(tracker.current(out))
		expect(ctx.editor.inputs.getCtrlKey()).toBe(true)
		tracker.releaseAll()
		expect(ctx.ui.latches.get()).toEqual({
			shift: false,
			alt: false,
			ctrl: false,
			stickyShift: false,
			stickyAlt: false,
			stickyCtrl: false,
		})
		expect(tracker.getHeld()).toEqual(NO_MODIFIERS)
		expect(tracker.getSynced()).toEqual(NO_MODIFIERS)
		expect(ctx.editor.inputs.keys.has('ShiftLeft')).toBe(false)
		expect(ctx.editor.inputs.keys.has('ControlLeft')).toBe(false)
	})
})
