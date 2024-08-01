import { TestEditor } from '../../test/TestEditor'
import { ScribbleManager } from './ScribbleManager'

describe('ScribbleManager', () => {
	let editor: TestEditor
	let scribbleManager: ScribbleManager

	beforeEach(() => {
		editor = new TestEditor()
		scribbleManager = new ScribbleManager(editor)
	})

	it('add a point with a default z value', () => {
		const { id } = scribbleManager.addScribble({})
		scribbleManager.addPoint(id, 5, 10)
		scribbleManager.tick(0)

		expect(scribbleManager.scribbleItems.get(id)!.scribble.points).toEqual([
			{ x: 5, y: 10, z: 0.5 },
		])
	})

	it('add a point with a custom z value', () => {
		const { id } = scribbleManager.addScribble({})
		scribbleManager.addPoint(id, 5, 10, 0.7)
		scribbleManager.tick(0)

		expect(scribbleManager.scribbleItems.get(id)!.scribble.points).toEqual([
			{ x: 5, y: 10, z: 0.7 },
		])
	})
})
