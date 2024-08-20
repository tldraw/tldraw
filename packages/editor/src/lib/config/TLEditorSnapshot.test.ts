import { PageRecordType, TLStore, createShapeId } from '@tldraw/tlschema'
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
	snapshot = structuredClone(snapshot)
	snapshot.document.store[page2Id] = PageRecordType.create({
		id: page2Id,
		name: 'my lovely page',
		index: 'a4' as IndexKey,
	})

	// and set the current page id
	snapshot.session.currentPageId = page2Id
	return snapshot
}

describe('loadSnapshot', () => {
	it('loads a snapshot into the store', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = addPage2(getSnapshot(store))

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

		const snapshot = addPage2(getSnapshot(store))

		expect(editor.getViewportScreenBounds()).not.toEqual(new Box(0, 0, 100, 100))
		editor.updateViewportScreenBounds(new Box(0, 0, 100, 100))
		expect(editor.getViewportScreenBounds()).toEqual(new Box(0, 0, 100, 100))

		loadSnapshot(store, snapshot)

		expect(editor.getViewportScreenBounds()).toEqual(new Box(0, 0, 100, 100))
	})

	it('works with just the document bits (1)', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = addPage2(getSnapshot(store))

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

		const snapshot = addPage2(getSnapshot(store))

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

		const snapshot = addPage2(getSnapshot(store))

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

	it('preserves session stuff if no session snapshot is provided', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const snapshot = getSnapshot(store)

		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })

		editor.setCamera({ x: 1, y: 2, z: 3 })

		loadSnapshot(store, snapshot.document)

		expect(editor.getCamera()).toMatchObject({ x: 1, y: 2, z: 3 })

		loadSnapshot(store, { document: snapshot.document })

		expect(editor.getCamera()).toMatchObject({ x: 1, y: 2, z: 3 })

		loadSnapshot(store, snapshot)

		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})

	it('preserves session stuff if only a partial session snapshot is provided', () => {
		const store = createTLStore({})
		const editor = createEditor(store)
		const page1Id = editor.getCurrentPageId()

		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ id: page2Id })
		editor.setCurrentPage(PageRecordType.createId('page2'))

		const snapshot = getSnapshot(store)

		delete snapshot.session.pageStates

		editor.setCurrentPage(page1Id)
		editor.setCamera({ x: 1, y: 2, z: 3 })

		loadSnapshot(store, snapshot)

		// the page should have switched back to page2 with the default camera
		expect(editor.getCurrentPageId()).toBe(page2Id)
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })

		// and because we updated the page1 camera after the snapshot was taken, it should still be the same
		editor.setCurrentPage(page1Id)
		expect(editor.getCamera()).toMatchObject({ x: 1, y: 2, z: 3 })
	})

	it('cleans up references to missing shapes from page state', () => {
		const store = createTLStore({})
		const editor = createEditor(store)

		const shapeA = createShapeId('a')
		editor.createShape({ type: 'group', id: shapeA })

		const snapshot = getSnapshot(store)

		const shapeB = createShapeId('b')
		editor.createShape({ type: 'group', id: shapeB }).select(shapeB, shapeA)

		loadSnapshot(store, snapshot.document)

		expect(editor.getCurrentPageState().selectedShapeIds).toEqual([shapeA])
	})
})
