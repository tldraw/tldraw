import { createTLStore } from '../../../config/createTLStore'
import { Editor } from '../../Editor'

function createTestEditor() {
	const store = createTLStore({})
	store.ensureStoreIsUsable()
	return new Editor({
		store,
		bindingUtils: [],
		shapeUtils: [],
		getContainer: () => document.createElement('div'),
		tools: [],
	})
}

describe('InputsManager', () => {
	let editor: Editor

	beforeEach(() => {
		editor = createTestEditor()
	})

	afterEach(() => {
		editor.dispose()
	})

	it('updates pointer velocity on frame events', () => {
		const point = editor.inputs.getCurrentScreenPoint()
		point.x = 0
		point.y = 0
		editor.emit('frame', 16)

		point.x = 100
		point.y = 0
		editor.emit('frame', 16)

		expect(editor.inputs.getPointerVelocity().len()).toBeGreaterThan(0)
	})

	it('stops updating pointer velocity after dispose', () => {
		const point = editor.inputs.getCurrentScreenPoint()
		point.x = 0
		point.y = 0
		editor.emit('frame', 16)

		point.x = 100
		point.y = 0
		editor.emit('frame', 16)

		const velocityBeforeDispose = editor.inputs.getPointerVelocity().clone()
		expect(velocityBeforeDispose.len()).toBeGreaterThan(0)

		editor.inputs.dispose()

		point.x = 200
		point.y = 0
		editor.emit('frame', 16)

		expect(editor.inputs.getPointerVelocity()).toEqual(velocityBeforeDispose)
	})
})
