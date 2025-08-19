import { PageRecordType, TLDeepLink, createDeepLinkString, createShapeId } from '@tldraw/editor'
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
})

const makeUrl = (link: TLDeepLink, name = 'd') => {
	return `http://localhost/?${name}=${createDeepLinkString(link)}`
}

describe('type: viewport', () => {
	it('handles linking to a viewport of the same dimensions', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(bounds)
		const link = makeUrl({ type: 'viewport', bounds })
		window.history.pushState({}, '', link)
		editor.navigateToDeepLink()
		expect(editor.getViewportPageBounds()).toMatchObject(bounds)
	})

	it('handles linking to a viewport of the same dimensions (explicit url)', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(bounds)
		const url = makeUrl({ type: 'viewport', bounds })
		editor.navigateToDeepLink({ url })
		expect(editor.getViewportPageBounds()).toMatchObject(bounds)
	})

	it('tries to contain the viewport if the dimensions are different (horizontal)', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width - 200, h: editor.bounds.height }
		// the given viewport is 200px smaller than the editor bounds, so it will shift the viewport to the left 100px
		// to center it horizontally
		const expected = { x: -600, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(expected)
		const url = makeUrl({ type: 'viewport', bounds })
		editor.navigateToDeepLink({ url })
		expect(editor.getViewportPageBounds()).toMatchObject(expected)
	})

	it('tries to contain the viewport if the dimensions are different (vertical)', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height - 200 }
		// the given viewport is 200px smaller than the editor bounds, so it will shift the viewport up 100px
		// to center it vertically
		const expected = { x: -500, y: 2242, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(expected)
		const url = makeUrl({ type: 'viewport', bounds })
		editor.navigateToDeepLink({ url })
		expect(editor.getViewportPageBounds()).toMatchObject(expected)
	})

	it('handles linking to a viewport on a specific page', () => {
		const pageId = PageRecordType.createId('foo')
		editor.createPage({ id: pageId })
		expect(editor.getCurrentPageId()).not.toBe(pageId)

		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		const url = makeUrl({ type: 'viewport', bounds, pageId })

		editor.navigateToDeepLink({ url })
		expect(editor.getCurrentPageId()).toBe(pageId)
		expect(editor.getViewportPageBounds()).toMatchObject(bounds)
	})

	it('will not change the viewport if the specific page does not exist', () => {
		const pageId = PageRecordType.createId('foo')

		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		const url = makeUrl({ type: 'viewport', bounds, pageId })

		editor.navigateToDeepLink({ url })
		expect(editor.getCurrentPageId()).not.toBe(pageId)
		expect(editor.getViewportPageBounds()).not.toMatchObject(bounds)
	})
})

describe('type: page', () => {
	it('handles linking to a page only, and will center the content on the page', () => {
		const initialPageId = editor.getCurrentPageId()
		const pageId = PageRecordType.createId('foo')
		editor.createPage({ id: pageId })
		editor.setCurrentPage(pageId)
		editor.createShapesFromJsx([<TL.geo x={200} y={200} w={100} h={100} />])
		editor.setCurrentPage(initialPageId)

		const url = makeUrl({ type: 'page', pageId })

		editor.navigateToDeepLink({ url })

		expect(editor.getCurrentPageId()).toBe(pageId)
		expect(editor.getViewportPageBounds()).toMatchObject({
			x: 250 - editor.bounds.width / 2,
			y: 250 - editor.bounds.height / 2,
		})
	})

	it('wont switch page if the page does not exist, but will still center the content', () => {
		const initialPageId = editor.getCurrentPageId()
		const pageId = PageRecordType.createId('foo')
		editor.createShapesFromJsx([<TL.geo x={200} y={200} w={100} h={100} />])

		const url = makeUrl({ type: 'page', pageId })

		editor.navigateToDeepLink({ url })

		expect(editor.getCurrentPageId()).toBe(initialPageId)
		expect(editor.getViewportPageBounds()).toMatchObject({
			x: 250 - editor.bounds.width / 2,
			y: 250 - editor.bounds.height / 2,
		})
	})
})

describe('type: shapes', () => {
	it('keeps it a 100% if they fit within the viewport', () => {
		const boxA = createShapeId()
		const boxB = createShapeId()
		const boxC = createShapeId()
		editor.createShapesFromJsx([
			<TL.geo id={boxA} x={100} y={100} w={100} h={100} />,
			<TL.geo id={boxB} x={-200} y={-200} w={100} h={100} />,
			<TL.geo id={boxC} x={300} y={300} w={100} h={100} />,
		])

		const url = makeUrl({ type: 'shapes', shapeIds: [boxA, boxB] })

		editor.navigateToDeepLink({ url })
		const viewport = editor.getViewportPageBounds()
		expect(viewport.contains(editor.getShapePageBounds(boxA)!)).toBe(true)
		expect(viewport.contains(editor.getShapePageBounds(boxB)!)).toBe(true)
		expect(viewport.contains(editor.getShapePageBounds(boxC)!)).toBe(false)
		expect(viewport).toMatchObject({ w: editor.bounds.width, h: editor.bounds.height })
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('zooms out if the shapes do not quite fit', () => {
		const boxA = createShapeId()
		const boxB = createShapeId()
		const boxC = createShapeId()
		editor.createShapesFromJsx([
			<TL.geo id={boxA} x={500} y={500} w={100} h={100} />,
			<TL.geo id={boxB} x={-500} y={-500} w={100} h={100} />,
			<TL.geo id={boxC} x={1300} y={1300} w={100} h={100} />,
		])

		const url = makeUrl({ type: 'shapes', shapeIds: [boxA, boxB] })

		editor.navigateToDeepLink({ url })
		const viewport = editor.getViewportPageBounds()
		expect(viewport.contains(editor.getShapePageBounds(boxA)!)).toBe(true)
		expect(viewport.contains(editor.getShapePageBounds(boxB)!)).toBe(true)
		expect(viewport.contains(editor.getShapePageBounds(boxC)!)).toBe(false)
		expect(viewport).not.toMatchObject({ w: editor.bounds.width, h: editor.bounds.height })
		expect(editor.getZoomLevel()).toBeLessThan(1)
	})

	it('switches to the page that most of the shapes are on', () => {
		const initialPageId = editor.getCurrentPageId()
		const otherPageId = PageRecordType.createId('foo')
		const boxA = createShapeId()
		const boxB = createShapeId()
		const boxC = createShapeId()
		editor.createShapesFromJsx([<TL.geo id={boxA} x={500} y={500} w={100} h={100} />])
		editor.createPage({ id: otherPageId })
		editor.setCurrentPage(otherPageId)
		editor.createShapesFromJsx([
			<TL.geo id={boxB} x={-500} y={-500} w={100} h={100} />,
			<TL.geo id={boxC} x={1300} y={1300} w={100} h={100} />,
		])
		editor.setCurrentPage(initialPageId)

		const url = makeUrl({ type: 'shapes', shapeIds: [boxA, boxB, boxC] })

		editor.navigateToDeepLink({ url })

		expect(editor.getCurrentPageId()).toBe(otherPageId)
		const viewport = editor.getViewportPageBounds()
		expect(viewport.contains(editor.getShapePageBounds(boxB)!)).toBe(true)
		expect(viewport.contains(editor.getShapePageBounds(boxC)!)).toBe(true)
	})
})
