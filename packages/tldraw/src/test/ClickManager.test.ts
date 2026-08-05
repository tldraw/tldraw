import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	// we want to do this in order to avoid creating text shapes. weird
	editor.setCurrentTool('eraser')
	editor._transformPointerDownSpy.mockRestore()
	editor._transformPointerUpSpy.mockRestore()
})

vi.useFakeTimers()

describe('Handles events', () => {
	it('Emits single click events', () => {
		const events: any[] = []
		editor.addListener('event', (info) => events.push(info))

		editor.pointerDown()
		editor.pointerUp()

		const eventsBeforeSettle = [{ name: 'pointer_down' }, { name: 'pointer_up' }]

		// allow time for settle
		vi.advanceTimersByTime(500)

		// nothing should have settled
		expect(events).toMatchObject(eventsBeforeSettle)

		// clear events and click again
		// the interaction should have reset
		events.length = 0
		editor.pointerDown().pointerUp().pointerDown()
		expect(events).toMatchObject([
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
		])
	})

	it('Emits double click events', () => {
		const events: any[] = []
		editor.addListener('event', (info) => events.push(info))

		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()

		const eventsBeforeSettle = [
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
			{ name: 'pointer_up' },
			// { name: 'pointer_move' },
			{ name: 'double_click', type: 'click', phase: 'up' },
		]

		for (let i = 0; i < eventsBeforeSettle.length; i++) {
			expect(events[i]).toMatchObject(eventsBeforeSettle[i])
		}

		// allow double click to settle as 'settle-up'
		vi.advanceTimersByTime(500)

		expect(events).toMatchObject([
			...eventsBeforeSettle,
			{ name: 'double_click', type: 'click', phase: 'settle-up' },
		])

		// clear events and click again
		// the interaction should have reset
		events.length = 0
		editor.pointerDown().pointerUp().pointerDown()
		expect(events).toMatchObject([
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
		])
	})

	it('Emits settle-down when pointer is still pressed at settle time', () => {
		const events: any[] = []
		editor.addListener('event', (info) => events.push(info))

		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown() // second press, no pointerUp — still down at settle time

		vi.advanceTimersByTime(500)

		// a long_press may also fire while holding; find the settle event by type
		const settle = events.find(
			(e) => e.type === 'click' && e.name === 'double_click' && e.phase?.startsWith('settle')
		)
		expect(settle).toMatchObject({
			name: 'double_click',
			type: 'click',
			phase: 'settle-down',
		})
	})

	it('Suppresses overflow clicks after a double click', () => {
		const events: any[] = []
		editor.addListener('event', (info) => events.push(info))

		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()

		const eventsBeforeSettle = [
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'double_click', type: 'click', phase: 'up' },
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
		]

		expect(events).toMatchObject(eventsBeforeSettle)

		// allow overflow to settle without emitting another click event
		vi.advanceTimersByTime(500)

		expect(events).toMatchObject(eventsBeforeSettle)

		// clear events and click again
		// the interaction should have reset
		events.length = 0
		editor.pointerDown().pointerUp().pointerDown()
		expect(events).toMatchObject([
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
		])
	})

	it('Suppresses double-double clicks until overflow settles', () => {
		const events: any[] = []
		editor.addListener('event', (info) => events.push(info))

		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()

		const eventsBeforeSettle = [
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'double_click', phase: 'up' },
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
		]

		expect(events).toMatchObject(eventsBeforeSettle)

		// allow overflow to settle
		vi.advanceTimersByTime(500)

		expect(events).toMatchObject(eventsBeforeSettle)

		// clear events and click again
		// the interaction should have reset
		events.length = 0
		editor.pointerDown().pointerUp().pointerDown()
		expect(events).toMatchObject([
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
		])
	})

	it('Keeps suppressing clicks while overflow clicks continue', () => {
		const events: any[] = []
		editor.addListener('event', (info) => events.push(info))

		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()
		editor.pointerDown()
		editor.pointerUp()

		const eventsBeforeSettle = [
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'double_click', type: 'click', phase: 'up' },
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
		]

		expect(events).toMatchObject(eventsBeforeSettle)

		// allow double click to settle
		vi.advanceTimersByTime(500)

		expect(events).toMatchObject(eventsBeforeSettle)

		// clear events and click again
		// the interaction should have reset
		events.length = 0
		editor.pointerDown().pointerUp().pointerDown()
		expect(events).toMatchObject([
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
			{ name: 'pointer_down' },
			{ name: 'double_click', type: 'click', phase: 'down' },
		])
	})
})

it('Cancels when click moves', () => {
	let event: any
	editor.addListener('event', (info) => (event = info))
	editor.pointerDown(0, 0)
	expect(event.name).toBe('pointer_down')
	editor.pointerUp(0, 0)
	expect(event.name).toBe('pointer_up')
	editor.pointerDown(0, 20)
	expect(event.name).toBe('double_click')
	editor.pointerUp(0, 20)
	expect(event.name).toBe('double_click')
	editor.pointerDown(0, 45)
	expect(event.name).toBe('pointer_down')
	editor.pointerUp(0, 45)
	expect(event.name).toBe('pointer_up')
	// has to be 40 away from previous click location
	editor.pointerDown(0, 86)
	expect(event.name).toBe('pointer_down')
	editor.pointerUp(0, 86)
	expect(event.name).toBe('pointer_up')
})

it('Resets when the focus layer changes', () => {
	const boxId = editor.testShapeID('box')
	const otherBoxId = editor.testShapeID('otherBox')

	editor.setCurrentTool('select')
	editor
		.createShapes([
			{ id: boxId, type: 'geo', x: 0, y: 0 },
			{ id: otherBoxId, type: 'geo', x: 200, y: 0 },
		])
		.select(boxId, otherBoxId)
		.groupShapes(editor.getSelectedShapeIds())
		.selectNone()

	const groupId = editor.getCurrentPageShapes().find((shape) => shape.type === 'group')!.id

	const events: any[] = []
	editor.addListener('event', (info) => events.push(info))

	editor.pointerDown(1000, 1000).pointerUp(1000, 1000)

	editor.setFocusedGroup(groupId)
	expect(editor.getFocusedGroupId()).toBe(groupId)

	events.length = 0
	editor.pointerDown(1000, 1000)

	expect(events).toMatchObject([{ name: 'pointer_down' }])
	expect(events).toHaveLength(1)
})
