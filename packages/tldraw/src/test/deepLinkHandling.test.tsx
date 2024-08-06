import { PageRecordType, TLDeepLink, createDeepLinkString } from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

jest.useFakeTimers()

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

describe('handleDeepLink', () => {
	it('handles linking to a viewport of the same dimensions', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(bounds)
		const link = makeUrl({ type: 'viewport', bounds })
		window.history.pushState({}, '', link)
		editor.handleDeepLink()
		expect(editor.getViewportPageBounds()).toMatchObject(bounds)
	})

	it('handles linking to a viewport of the same dimensions (explicit url)', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(bounds)
		const url = makeUrl({ type: 'viewport', bounds })
		editor.handleDeepLink({ url })
		expect(editor.getViewportPageBounds()).toMatchObject(bounds)
	})

	it('tries to contain the viewport if the dimensions are different (horizontal)', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width - 200, h: editor.bounds.height }
		// the given viewport is 200px smaller than the editor bounds, so it will shift the viewport to the left 100px
		// to center it horizontally
		const expected = { x: -600, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(expected)
		const url = makeUrl({ type: 'viewport', bounds })
		editor.handleDeepLink({ url })
		expect(editor.getViewportPageBounds()).toMatchObject(expected)
	})

	it('tries to contain the viewport if the dimensions are different (vertical)', () => {
		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height - 200 }
		// the given viewport is 200px smaller than the editor bounds, so it will shift the viewport up 100px
		// to center it vertically
		const expected = { x: -500, y: 2242, w: editor.bounds.width, h: editor.bounds.height }
		expect(editor.getViewportPageBounds()).not.toMatchObject(expected)
		const url = makeUrl({ type: 'viewport', bounds })
		editor.handleDeepLink({ url })
		expect(editor.getViewportPageBounds()).toMatchObject(expected)
	})

	it('handles linking to a viewport on a specific page', () => {
		const pageId = PageRecordType.createId('foo')
		editor.createPage({ id: pageId })
		expect(editor.getCurrentPageId()).not.toBe(pageId)

		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		const url = makeUrl({ type: 'viewport', bounds, pageId })

		editor.handleDeepLink({ url })
		expect(editor.getCurrentPageId()).toBe(pageId)
		expect(editor.getViewportPageBounds()).toMatchObject(bounds)
	})

	it('will not change the viewport if the specific page does not exist', () => {
		const pageId = PageRecordType.createId('foo')

		const bounds = { x: -500, y: 2342, w: editor.bounds.width, h: editor.bounds.height }
		const url = makeUrl({ type: 'viewport', bounds, pageId })

		editor.handleDeepLink({ url })
		expect(editor.getCurrentPageId()).not.toBe(pageId)
		expect(editor.getViewportPageBounds()).not.toMatchObject(bounds)
	})

	it('handles linking to a page only, and will center the content on the page', () => {
		const initialPageId = editor.getCurrentPageId()
		const pageId = PageRecordType.createId('foo')
		editor.createPage({ id: pageId })
		editor.setCurrentPage(pageId)
		editor.createShapesFromJsx([<TL.geo x={200} y={200} w={100} h={100} />])
		editor.setCurrentPage(initialPageId)

		const url = makeUrl({ type: 'page', pageId })

		editor.handleDeepLink({ url })

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

		editor.handleDeepLink({ url })

		expect(editor.getCurrentPageId()).toBe(initialPageId)
		expect(editor.getViewportPageBounds()).toMatchObject({
			x: 250 - editor.bounds.width / 2,
			y: 250 - editor.bounds.height / 2,
		})
	})
})
