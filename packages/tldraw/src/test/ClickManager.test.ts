import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	// we want to do this in order to avoid creating text shapes. weird
	editor.setCurrentTool('eraser')
	editor._transformPointerDownSpy.mockRestore()
	editor._transformPointerUpSpy.mockRestore()
})

jest.useFakeTimers()

describe('Handles events', () => {
	it('Emits single click events', () => {
		const events: any[] = []
		editor.addListener('event', (info) => events.push(info))

		editor.pointerDown()
		editor.pointerUp()

		const eventsBeforeSettle = [{ name: 'pointer_down' }, { name: 'pointer_up' }]

		// allow time for settle
		jest.advanceTimersByTime(500)

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

		// allow double click to settle
		jest.advanceTimersByTime(500)

		expect(events).toMatchObject([
			...eventsBeforeSettle,
			{ name: 'double_click', type: 'click', phase: 'settle' },
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

	it('Emits triple click events', () => {
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
			{ name: 'triple_click', type: 'click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'triple_click', type: 'click', phase: 'up' },
		]

		expect(eventsBeforeSettle).toMatchObject(eventsBeforeSettle)

		// allow double click to settle
		jest.advanceTimersByTime(500)

		expect(events).toMatchObject([
			...eventsBeforeSettle,
			{ name: 'triple_click', type: 'click', phase: 'settle' },
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

	it('Emits quadruple click events', () => {
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
			{ name: 'triple_click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'triple_click', phase: 'up' },
			{ name: 'pointer_down' },
			{ name: 'quadruple_click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'quadruple_click', phase: 'up' },
		]

		expect(events).toMatchObject(eventsBeforeSettle)

		// allow double click to settle
		jest.advanceTimersByTime(500)

		expect(events).toMatchObject([
			...eventsBeforeSettle,
			{ name: 'quadruple_click', type: 'click', phase: 'settle' },
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

	it('Emits overflow click events', () => {
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
			{ name: 'triple_click', type: 'click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'triple_click', type: 'click', phase: 'up' },
			{ name: 'pointer_down' },
			{ name: 'quadruple_click', type: 'click', phase: 'down' },
			{ name: 'pointer_up' },
			{ name: 'quadruple_click', type: 'click', phase: 'up' },
			{ name: 'pointer_down' },
			{ name: 'pointer_up' },
		]

		expect(events).toMatchObject(eventsBeforeSettle)

		// allow double click to settle
		jest.advanceTimersByTime(500)

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
	expect(event.name).toBe('triple_click')
	editor.pointerUp(0, 45)
	expect(event.name).toBe('triple_click')
	// has to be 40 away from previous click location
	editor.pointerDown(0, 86)
	expect(event.name).toBe('pointer_down')
	editor.pointerUp(0, 86)
	expect(event.name).toBe('pointer_up')
})
