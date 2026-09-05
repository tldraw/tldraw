import { PageRecordType } from '@tldraw/tlschema'
import { vi } from 'vitest'
import {
	Box,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	createShapeId,
} from '../../..'
import { TestEditor } from '../../test/TestEditor'

const BOX_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100, text: '', isFilled: true }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

vi.useFakeTimers()

let editor: TestEditor

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	page2: PageRecordType.createId('page2'),
}

function viewport() {
	const { x, y, w, h } = editor.getViewportPageBounds()
	return { x, y, w, h }
}

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [BoxShapeUtil] })
	editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
	editor.createPage({ id: ids.page2, name: 'page 2' })
	// a lives on the first page, b and c on the second
	editor.createShape({ id: ids.a, type: BOX_TYPE, x: 2000, y: 2000 })
	editor.setCurrentPage(ids.page2)
	editor.createShapes([
		{ id: ids.b, type: BOX_TYPE, x: 5000, y: 5000 },
		{ id: ids.c, type: BOX_TYPE, x: 5100, y: 5000 },
	])
	editor.setCurrentPage(editor.getPages()[0].id)
	window.history.replaceState({}, '', '/doc')
})

afterEach(() => {
	editor.dispose()
	vi.restoreAllMocks()
})

describe('createDeepLink', () => {
	it('links to the current page and viewport by default', () => {
		const url = editor.createDeepLink()
		expect(url.toString()).toBe(`${window.location.origin}/doc?d=v0.0.1000.1000.page`)
	})

	it('reflects the camera position and zoom', () => {
		editor.setCamera({ x: -100, y: -50, z: 2 })
		expect(editor.createDeepLink().searchParams.get('d')).toBe('v100.50.500.500.page')
	})

	it('omits the page when the editor only allows a single page', () => {
		// @ts-expect-error - options are readonly
		editor.options.maxPages = 1
		expect(editor.createDeepLink().searchParams.get('d')).toBe('v0.0.1000.1000')
	})

	it('uses the given url and param, keeping the other params', () => {
		const url = editor.createDeepLink({ url: 'https://example.com/doc?x=1', param: 'q' })
		expect(url.toString()).toBe('https://example.com/doc?x=1&q=v0.0.1000.1000.page')
		expect(editor.createDeepLink({ url: new URL('https://example.com/?d=old') }).toString()).toBe(
			'https://example.com/?d=v0.0.1000.1000.page'
		)
	})

	it('links to shapes or pages when given a target', () => {
		expect(
			editor
				.createDeepLink({ to: { type: 'shapes', shapeIds: [ids.a, ids.b] } })
				.searchParams.get('d')
		).toBe('sa.b')
		expect(
			editor.createDeepLink({ to: { type: 'page', pageId: ids.page2 } }).searchParams.get('d')
		).toBe('ppage2')
	})
})

describe('navigateToDeepLink', () => {
	describe('with a deep link object', () => {
		it('switches to the page and fits its content at 100%', () => {
			expect(editor.navigateToDeepLink({ type: 'page', pageId: ids.page2 })).toBe(editor)
			expect(editor.getCurrentPageId()).toBe(ids.page2)
			expect(editor.getZoomLevel()).toBe(1)
			expect(viewport()).toEqual({ x: 4600, y: 4550, w: 1000, h: 1000 })
		})

		it('fits the current page when the page does not exist', () => {
			const page1 = editor.getCurrentPageId()
			editor.navigateToDeepLink({ type: 'page', pageId: PageRecordType.createId('missing') })
			expect(editor.getCurrentPageId()).toBe(page1)
			expect(viewport()).toEqual({ x: 1550, y: 1550, w: 1000, h: 1000 })
		})

		it('zooms to the shapes, on the page that has the most of them', () => {
			editor.navigateToDeepLink({ type: 'shapes', shapeIds: [ids.a, ids.b, ids.c] })
			expect(editor.getCurrentPageId()).toBe(ids.page2)
			expect(editor.getZoomLevel()).toBe(1)
			expect(viewport()).toEqual({ x: 4600, y: 4550, w: 1000, h: 1000 })

			editor.navigateToDeepLink({ type: 'shapes', shapeIds: [ids.a] })
			expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
			expect(viewport()).toEqual({ x: 1550, y: 1550, w: 1000, h: 1000 })
		})

		it('fits the current page when none of the shapes exist', () => {
			editor.navigateToDeepLink({ type: 'shapes', shapeIds: [createShapeId('missing')] })
			expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
			expect(viewport()).toEqual({ x: 1550, y: 1550, w: 1000, h: 1000 })
		})

		it('restores a viewport, switching page when one is given', () => {
			editor.navigateToDeepLink({
				type: 'viewport',
				bounds: { x: 100, y: 200, w: 500, h: 500 },
				pageId: ids.page2,
			})
			expect(editor.getCurrentPageId()).toBe(ids.page2)
			expect(viewport()).toEqual({ x: 100, y: 200, w: 500, h: 500 })
			expect(editor.getZoomLevel()).toBe(2)

			editor.navigateToDeepLink({ type: 'viewport', bounds: { x: 10, y: 20, w: 2000, h: 2000 } })
			expect(editor.getCurrentPageId()).toBe(ids.page2)
			expect(viewport()).toEqual({ x: 10, y: 20, w: 2000, h: 2000 })
		})

		it('fits the current page when the viewport page does not exist', () => {
			editor.navigateToDeepLink({
				type: 'viewport',
				bounds: { x: 100, y: 200, w: 500, h: 500 },
				pageId: PageRecordType.createId('missing'),
			})
			expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
			expect(viewport()).toEqual({ x: 1550, y: 1550, w: 1000, h: 1000 })
		})
	})

	describe('with a url', () => {
		it('reads the deep link from the query param', () => {
			editor.navigateToDeepLink({ url: 'https://example.com/doc?d=v100.200.500.500.page2' })
			expect(editor.getCurrentPageId()).toBe(ids.page2)
			expect(viewport()).toEqual({ x: 100, y: 200, w: 500, h: 500 })
		})

		it('reads a custom param from a URL object', () => {
			editor.navigateToDeepLink({ url: new URL('https://example.com/doc?q=ppage2'), param: 'q' })
			expect(editor.getCurrentPageId()).toBe(ids.page2)
		})

		it('falls back to window.location', () => {
			window.history.replaceState({}, '', '/doc?d=sb.c')
			editor.navigateToDeepLink()
			expect(editor.getCurrentPageId()).toBe(ids.page2)
			expect(viewport()).toEqual({ x: 4600, y: 4550, w: 1000, h: 1000 })
		})

		it('fits the page content when the param is missing', () => {
			editor.navigateToDeepLink({ url: 'https://example.com/doc' })
			expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
			expect(viewport()).toEqual({ x: 1550, y: 1550, w: 1000, h: 1000 })
		})

		it('warns and fits the page content when the param is malformed', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			editor.navigateToDeepLink({ url: 'https://example.com/doc?d=v1.2.nope.4' })
			expect(warn).toHaveBeenCalledTimes(1)
			expect(viewport()).toEqual({ x: 1550, y: 1550, w: 1000, h: 1000 })
		})
	})

	it('round trips a link created by createDeepLink', () => {
		editor.setCurrentPage(ids.page2)
		editor.setCamera({ x: -100, y: -50, z: 2 })
		const url = editor.createDeepLink()
		editor.setCurrentPage(editor.getPages()[0].id)
		editor.setCamera({ x: 0, y: 0, z: 1 })

		editor.navigateToDeepLink({ url })
		expect(editor.getCurrentPageId()).toBe(ids.page2)
		expect(viewport()).toEqual({ x: 100, y: 50, w: 500, h: 500 })
	})
})

describe('registerDeepLinkListener', () => {
	it('throws when getUrl is given without onChange', () => {
		expect(() => editor.registerDeepLinkListener({ getUrl: () => 'https://x.com' })).toThrow()
	})

	it('reports the deep link url after the debounce, and again when the viewport changes', () => {
		const onChange = vi.fn()
		const unlisten = editor.registerDeepLinkListener({ onChange, debounceMs: 100 })
		expect(onChange).not.toHaveBeenCalled()

		vi.advanceTimersByTime(100)
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange.mock.calls[0][0].toString()).toBe(
			`${window.location.origin}/doc?d=v0.0.1000.1000.page`
		)
		expect(onChange.mock.calls[0][1]).toBe(editor)

		editor.setCamera({ x: -100, y: -50, z: 2 })
		expect(onChange).toHaveBeenCalledTimes(1)
		vi.advanceTimersByTime(1000)
		expect(onChange).toHaveBeenCalledTimes(2)
		expect(onChange.mock.calls[1][0].searchParams.get('d')).toBe('v100.50.500.500.page')

		unlisten()
		editor.setCamera({ x: 0, y: 0, z: 1 })
		vi.advanceTimersByTime(1000)
		expect(onChange).toHaveBeenCalledTimes(2)
	})

	it('uses getUrl, getTarget, and param when given', () => {
		const onChange = vi.fn()
		const unlisten = editor.registerDeepLinkListener({
			onChange,
			param: 'q',
			getUrl: () => 'https://example.com/doc',
			getTarget: () => ({ type: 'page', pageId: ids.page2 }),
		})
		vi.advanceTimersByTime(500)
		expect(onChange.mock.calls[0][0].toString()).toBe('https://example.com/doc?q=ppage2')
		unlisten()
	})

	it('updates window.location in place by default', () => {
		const replaceState = vi.spyOn(window.history, 'replaceState')
		const unlisten = editor.registerDeepLinkListener()
		vi.advanceTimersByTime(500)
		expect(replaceState).toHaveBeenCalledTimes(1)
		expect(replaceState.mock.calls[0][2]).toBe(
			`${window.location.origin}/doc?d=v0.0.1000.1000.page`
		)
		unlisten()
	})
})
