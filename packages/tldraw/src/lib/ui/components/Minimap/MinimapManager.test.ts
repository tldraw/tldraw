import { createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../../test/TestEditor'
import { MinimapManager } from './MinimapManager'

let editor: TestEditor
let minimap: MinimapManager

const ids = {
	box: createShapeId('box'),
	other: createShapeId('other'),
	arrow: createShapeId('arrow'),
}

beforeAll(() => {
	// jsdom has neither Path2D nor a canvas context.
	vi.stubGlobal('Path2D', class {})
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
		() => new Proxy({}, { get: () => () => {} }) as any
	)
})

afterAll(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.other, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.arrow, type: 'arrow', x: 0, y: 300 },
	])
	editor.selectNone()
	const container = document.createElement('div')
	const canvas = document.createElement('canvas')
	container.appendChild(canvas)
	minimap = new MinimapManager(editor, canvas, container)
})

afterEach(() => {
	minimap.close()
	editor.dispose()
})

describe('closing the minimap', () => {
	const heldBounds = () => (editor as any)._currentPageMaskedBounds.maps?.bounds
	const endOfTask = () => new Promise<void>((resolve) => queueMicrotask(resolve))

	it("frees the editor's bounds map when nothing else reads it", async () => {
		await endOfTask()
		expect(heldBounds().size).toBe(3)

		minimap.close()
		await endOfTask()
		expect(heldBounds()).toBeUndefined()
	})

	it('keeps the map while another minimap is still open', async () => {
		const container = document.createElement('div')
		const canvas = document.createElement('canvas')
		container.appendChild(canvas)
		const other = new MinimapManager(editor, canvas, container)

		minimap.close()
		await endOfTask()
		expect(heldBounds().size).toBe(3)

		other.close()
		await endOfTask()
		expect(heldBounds()).toBeUndefined()
	})
})
