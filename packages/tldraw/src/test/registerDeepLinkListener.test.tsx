import { PageRecordType, Vec, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

vi.useFakeTimers()

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

beforeEach(() => {
	editor = new TestEditor()

	editor.createShapes([])
	window.history.replaceState({}, '', 'http://localhost/test')
})

test('it creates a listener that updates the current url', async () => {
	const unlisten = editor.registerDeepLinkListener()

	vi.advanceTimersByTime(1000)
	expect(window.location.href).toMatchInlineSnapshot(`"http://localhost/test?d=v0.0.1080.720.page"`)

	const pageId = PageRecordType.createId('foo')
	editor.createPage({ id: pageId })
	editor.setCurrentPage(pageId)

	vi.advanceTimersByTime(1000)

	expect(window.location.href).toMatchInlineSnapshot(`"http://localhost/test?d=v0.0.1080.720.foo"`)

	editor.pan({ x: 100, y: 100 })

	vi.advanceTimersByTime(1000)

	expect(window.location.href).toMatchInlineSnapshot(
		`"http://localhost/test?d=v-100.-100.1080.720.foo"`
	)

	unlisten()

	editor.pan({ x: 500, y: 500 })

	vi.advanceTimersByTime(1000)

	expect(window.location.href).toMatchInlineSnapshot(
		`"http://localhost/test?d=v-100.-100.1080.720.foo"`
	)
})

test('it allows specifying a page target', async () => {
	const getNearestShape = () => {
		const allShapes = editor.getCurrentPageShapes()
		const viewportCenter = editor.getViewportPageCenter()
		allShapes.sort((a, b) => {
			const aCenter = editor.getShapePageBounds(a)!.center
			const bCenter = editor.getShapePageBounds(b)!.center
			const aDist = Vec.Dist(aCenter, viewportCenter)
			const bDist = Vec.Dist(bCenter, viewportCenter)
			return aDist - bDist
		})
		return allShapes[0]
	}

	const unlisten = editor.registerDeepLinkListener({
		getTarget() {
			const shape = getNearestShape()
			if (shape) {
				return { type: 'shapes', shapeIds: [shape.id] }
			}
			return { type: 'page', pageId: editor.getCurrentPageId() }
		},
		param: 'foo',
	})

	vi.advanceTimersByTime(1000)

	// no shapes yet
	expect(window.location.href).toMatchInlineSnapshot(`"http://localhost/test?foo=ppage"`)

	const boxA = createShapeId('a')
	const boxB = createShapeId('b')
	editor.createShapesFromJsx([
		<TL.geo id={boxA} x={200} y={200} w={100} h={100} />,
		<TL.geo id={boxB} x={1000} y={1000} w={100} h={100} />,
	])

	vi.advanceTimersByTime(1000)
	expect(window.location.href).toMatchInlineSnapshot(`"http://localhost/test?foo=sa"`)

	editor.pan({ x: -1000, y: -1000 })

	vi.advanceTimersByTime(1000)
	expect(window.location.href).toMatchInlineSnapshot(`"http://localhost/test?foo=sb"`)

	unlisten()

	editor.pan({ x: 1000, y: 1000 })

	vi.advanceTimersByTime(1000)
	expect(window.location.href).toMatchInlineSnapshot(`"http://localhost/test?foo=sb"`)
	expect(getNearestShape().id).toBe(boxA)
})
