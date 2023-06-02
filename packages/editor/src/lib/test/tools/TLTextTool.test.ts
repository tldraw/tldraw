import { TLTextTool } from '../../app/statechart/TLTextTool/TLTextTool'
import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})
afterEach(() => {
	app?.dispose()
})

describe(TLTextTool, () => {
	it('Creates text, edits it, undoes and redoes', () => {
		expect(app.shapesArray.length).toBe(0)
		app.setSelectedTool('text')
		app.expectToBeIn('text.idle')
		app.pointerDown(0, 0)
		app.expectToBeIn('text.pointing')
		app.pointerUp()
		app.expectToBeIn('select.editing_shape')
		// This comes from the component, not the state chart
		app.updateShapes([{ ...app.shapesArray[0]!, type: 'text', props: { text: 'Hello' } }])
		// Deselect the editing shape
		app.cancel()
		app.expectToBeIn('select.idle')
		expect(app.shapesArray.length).toBe(1)
		app.expectShapeToMatch({ id: app.shapesArray[0].id, type: 'text', props: { text: 'Hello' } })

		app.undo()

		expect(app.shapesArray.length).toBe(0)

		app.redo()

		expect(app.shapesArray.length).toBe(1)

		app.expectShapeToMatch({ id: app.shapesArray[0].id, type: 'text', props: { text: 'Hello' } })
	})
})

describe('When selecting the tool', () => {
	it('starts in idle, transitions to pointing and dragging', () => {
		app.setSelectedTool('text')
		app.expectToBeIn('text.idle')
	})
})

describe('When in idle state', () => {
	it('Transitions to pointing on pointer down', () => {
		app.setSelectedTool('text')
		app.pointerDown(0, 0)
		app.expectToBeIn('text.pointing')
		app.pointerUp()
		app.expectToBeIn('select.editing_shape')
	})

	it('creates a shape on pointer up', () => {
		app.setSelectedTool('text')
		app.pointerDown(0, 0)
		app.pointerUp()
		app.expectToBeIn('select.editing_shape')
		expect(app.shapesArray.length).toBe(1)
	})

	it('returns to select on cancel', () => {
		app.setSelectedTool('text')
		app.cancel()
		app.expectToBeIn('select.idle')
	})
})

describe('When in the pointing state', () => {
	it('returns to idle on escape', () => {
		app.setSelectedTool('text')
		app.pointerDown(0, 0)
		app.cancel()
		app.expectToBeIn('text.idle')
		expect(app.shapesArray.length).toBe(0)
	})

	it('returns to idle on interrupt', () => {
		app.setSelectedTool('text')
		app.pointerDown(0, 0)
		app.expectToBeIn('text.pointing')
		app.interrupt()
		app.expectToBeIn('text.idle')
		expect(app.shapesArray.length).toBe(0)
	})

	it('transitions to select.resizing when dragging and edits on pointer up', () => {
		app.setSelectedTool('text')
		app.pointerDown(0, 0)
		app.pointerMove(10, 10)
		app.expectToBeIn('select.resizing')
		app.pointerUp()
		expect(app.shapesArray.length).toBe(1)
		app.expectToBeIn('select.editing_shape')
	})

	it('on pointer up, preserves the center when the text has a auto width', () => {
		app.setSelectedTool('text')
		const x = 0
		const y = 0
		app.pointerDown(x, y)
		app.pointerUp()
		const bounds = app.getPageBounds(app.shapesArray[0])!
		expect(app.shapesArray[0]).toMatchObject({
			x: x - bounds.width / 2,
			y: y - bounds.height / 2,
		})
	})
})

describe('When resizing', () => {
	it('bails on escape while resizing and returns to text.idle', () => {
		app.setSelectedTool('text')
		app.pointerDown(0, 0)
		app.pointerMove(100, 100)
		app.expectToBeIn('select.resizing')
		app.cancel()
		app.expectToBeIn('text.idle')
		expect(app.shapesArray.length).toBe(0)
	})

	it('does not bails on interrupt while resizing', () => {
		app.setSelectedTool('text')
		app.pointerDown(0, 0)
		app.pointerMove(100, 100)
		app.expectToBeIn('select.resizing')
		app.interrupt()
		expect(app.shapesArray.length).toBe(1)
	})

	it('preserves the top left when the text has a fixed width', () => {
		app.setSelectedTool('text')
		const x = 0
		const y = 0
		app.pointerDown(x, y)
		app.pointerMove(x + 100, y + 100)
		expect(app.shapesArray[0]).toMatchObject({
			x,
			y,
		})
	})
})
