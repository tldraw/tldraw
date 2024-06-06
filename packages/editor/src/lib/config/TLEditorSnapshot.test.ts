import { PageRecordType, TLStore } from '@tldraw/tlschema'
import { IndexKey } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { Box } from '../primitives/Box'
import { TLEditorSnapshot, getSnapshot, loadSnapshot } from './TLEditorSnapshot'
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

const page2Id = PageRecordType.createId('page2')
function addPage2(snapshot: TLEditorSnapshot) {
	// sneakily add a page
	snapshot.document.store[page2Id] = PageRecordType.create({
		id: page2Id,
		name: 'my lovely page',
		index: 'a4' as IndexKey,
	})

	// and set the current page id
	snapshot.session.currentPageId = page2Id
}

describe('loadSnapshot', () => {
	it('loads a snapshot into the store', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		addPage2(snapshot)

		loadSnapshot(store, snapshot)

		expect(
			editor
				.getPages()
				.map((p) => p.id)
				.sort()
		).toEqual(['page:page', 'page:page2'])
		expect(editor.getCurrentPageId()).toBe(page2Id)
	})

	it('does not overwrite changes to the viewport page bounds', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		expect(editor.getViewportScreenBounds()).not.toEqual(new Box(0, 0, 100, 100))
		editor.updateViewportScreenBounds(new Box(0, 0, 100, 100))
		expect(editor.getViewportScreenBounds()).toEqual(new Box(0, 0, 100, 100))

		addPage2(snapshot)

		loadSnapshot(store, snapshot)

		expect(editor.getViewportScreenBounds()).toEqual(new Box(0, 0, 100, 100))
	})

	it('works with just the document bits (1)', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		addPage2(snapshot)

		loadSnapshot(store, snapshot.document)

		expect(
			editor
				.getPages()
				.map((p) => p.id)
				.sort()
		).toEqual(['page:page', 'page:page2'])
		expect(editor.getCurrentPageId()).toBe('page:page')
	})

	it('works with just the document bits (2)', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		addPage2(snapshot)

		loadSnapshot(store, { document: snapshot.document })

		expect(
			editor
				.getPages()
				.map((p) => p.id)
				.sort()
		).toEqual(['page:page', 'page:page2'])
		expect(editor.getCurrentPageId()).toBe('page:page')
	})

	it('allows loading the session bits later', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		addPage2(snapshot)

		loadSnapshot(store, snapshot.document)

		expect(
			editor
				.getPages()
				.map((p) => p.id)
				.sort()
		).toEqual(['page:page', 'page:page2'])
		expect(editor.getCurrentPageId()).toBe('page:page')

		loadSnapshot(store, { session: snapshot.session })
		expect(editor.getCurrentPageId()).toBe('page:page2')
	})
})
