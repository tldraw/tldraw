import { PageRecordType, TLStore } from '@tldraw/tlschema'
import { IndexKey } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { Box } from '../primitives/Box'
import { getSnapshot, loadSnapshot } from './TLEditorSnapshot'
import { createTLStore } from './createTLStore'

const createEditor = (store: TLStore) => {
	return new Editor({
		store,
		bindingUtils: [],
		shapeUtils: [],
		getContainer: () => document.createElement('div'),
		tools: [],
	})
}

describe('getSnapshot', () => {
	it('should return a TLEditorSnapshot', () => {
		const store = createTLStore({})
		store.ensureStoreIsUsable()
		const snapshot = getSnapshot(store)
		expect(snapshot).toMatchObject({
			document: {
				schema: {},
				store: {
					'document:document': {},
					'page:page': {},
				},
			},
			session: {
				currentPageId: 'page:page',
				exportBackground: true,
				isDebugMode: false,
				isFocusMode: false,
				isGridMode: false,
				isToolLocked: false,
				pageStates: [
					{
						camera: { x: 0, y: 0, z: 1 },
						focusedGroupId: null,
						pageId: 'page:page',
						selectedShapeIds: [],
					},
				],
				version: 0,
			},
		})

		const editor = createEditor(store)

		editor.updateInstanceState({ isDebugMode: true })
		editor.createPage({ id: PageRecordType.createId('page2') })
		editor.setCurrentPage(PageRecordType.createId('page2'))

		const snapshot2 = getSnapshot(store)
		expect(snapshot2).toMatchObject({
			document: {
				schema: {},
				store: {
					'document:document': {},
					'page:page': {},
					'page:page2': {},
				},
			},
			session: {
				currentPageId: 'page:page2',
				isDebugMode: true,
				pageStates: [{}, {}],
				version: 0,
			},
		})
	})
})

describe('loadSnapshot', () => {
	it('loads a snapshot into the store', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		// sneakily add a page
		const pageId = PageRecordType.createId('page2')
		snapshot.document.store[pageId] = PageRecordType.create({
			id: pageId,
			name: 'my lovely page',
			index: 'a4' as IndexKey,
		})

		// and set the current page id
		snapshot.session.currentPageId = pageId

		loadSnapshot(store, snapshot)

		expect(
			editor
				.getPages()
				.map((p) => p.id)
				.sort()
		).toEqual(['page:page', 'page:page2'])
		expect(editor.getCurrentPageId()).toBe(pageId)
	})

	it('does not overwrite changes to the viewport page bounds', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		expect(editor.getViewportScreenBounds()).not.toEqual(new Box(0, 0, 100, 100))
		editor.updateViewportScreenBounds(new Box(0, 0, 100, 100))
		expect(editor.getViewportScreenBounds()).toEqual(new Box(0, 0, 100, 100))

		// sneakily add a page
		const pageId = PageRecordType.createId('page2')
		snapshot.document.store[pageId] = PageRecordType.create({
			id: pageId,
			name: 'my lovely page',
			index: 'a4' as IndexKey,
		})

		// and set the current page id
		snapshot.session.currentPageId = pageId

		loadSnapshot(store, snapshot)

		expect(editor.getViewportScreenBounds()).toEqual(new Box(0, 0, 100, 100))
	})
})
