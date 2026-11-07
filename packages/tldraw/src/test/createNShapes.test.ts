import { createShapeId } from '@tldraw/editor'
import { createNShapes } from '../lib/ui/components/DebugMenu/DefaultDebugMenuContent'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('createNShapes (debug menu)', () => {
	it('creates new shapes after a reload instead of overwriting the earlier ones', async () => {
		createNShapes(editor, 10)
		const firstIds = [...editor.getCurrentPageShapeIds()]
		expect(firstIds).toHaveLength(10)
		const snapshot = editor.getSnapshot()

		// A reload starts the module over, which is where ids derived from module
		// state collide with the shapes that survived in the persisted document.
		vi.resetModules()
		const fresh = await import('../lib/ui/components/DebugMenu/DefaultDebugMenuContent')
		const { TestEditor: FreshTestEditor } = await import('./TestEditor')
		const reloaded = new FreshTestEditor()
		reloaded.loadSnapshot(snapshot)

		fresh.createNShapes(reloaded, 10)
		expect(reloaded.getCurrentPageShapeIds().size).toBe(20)
		for (const id of firstIds) {
			expect(reloaded.getCurrentPageShapeIds().has(id)).toBe(true)
		}
	})

	it('undoes in one step without taking earlier changes with it', () => {
		const box = createShapeId()
		editor.createShape({ id: box, type: 'geo', x: 0, y: 0 })

		createNShapes(editor, 10)
		expect(editor.getCurrentPageShapeIds().size).toBe(11)

		editor.undo()
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
		expect(editor.getShape(box)).toBeDefined()
	})

	it('lays the grid out at the top left of the viewport', () => {
		editor.setCamera({ x: -1000, y: -2000 })
		const viewport = editor.getViewportPageBounds()

		createNShapes(editor, 10)

		const bounds = editor.getSelectionPageBounds()!
		expect(bounds.x).toBe(viewport.x)
		expect(bounds.y).toBe(viewport.y)
	})
})
