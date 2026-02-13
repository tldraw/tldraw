import { PageRecordType, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

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

test('it uses the window.location.href and viewport+page by default', () => {
	const pageId = PageRecordType.createId('foo')
	editor.createPage({ id: pageId })
	editor.setCurrentPage(pageId)
	expect(editor.createDeepLink()).toMatchInlineSnapshot(
		`"http://localhost/test?d=v0.0.1080.720.foo"`
	)
})

test('it does not include page if maxPages is 1', () => {
	editor = new TestEditor({ options: { maxPages: 1 } })
	expect(editor.createDeepLink()).toMatchInlineSnapshot(`"http://localhost/test?d=v0.0.1080.720"`)
})

test('it allows specifying a page target', () => {
	const pageId = PageRecordType.createId('foo')
	const url = editor.createDeepLink({
		to: { type: 'page', pageId },
	})
	expect(url).toMatchInlineSnapshot(`"http://localhost/test?d=pfoo"`)
})

test('it allows specifying shapes as targets', () => {
	const shapeA = createShapeId('a')
	const shapeB = createShapeId('b')
	const url = editor.createDeepLink({
		to: { type: 'shapes', shapeIds: [shapeA, shapeB] },
	})
	expect(url).toMatchInlineSnapshot(`"http://localhost/test?d=sa.b"`)
})

test('it allows customizing the param name', () => {
	const url = editor.createDeepLink({
		param: 'foo',
	})
	expect(url).toMatchInlineSnapshot(`"http://localhost/test?foo=v0.0.1080.720.page"`)
})
