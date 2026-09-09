import { react } from '@tldraw/state'
import {
	CameraRecordType,
	InstancePageStateRecordType,
	PageRecordType,
	TLINSTANCE_ID,
	TLStore,
	createShapeId,
} from '@tldraw/tlschema'
import { getFromSessionStorage } from '@tldraw/utils'
import { vi } from 'vitest'
import { Editor } from '../editor/Editor'
import { createTLStore } from './createTLStore'
import {
	TAB_ID,
	TLSessionStateSnapshot,
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
} from './TLSessionStateSnapshot'

const pageA = PageRecordType.createId('a')
const pageB = PageRecordType.createId('b')

let store: TLStore
let editor: Editor
let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	store = createTLStore({})
	editor = new Editor({
		store,
		bindingUtils: [],
		shapeUtils: [],
		tools: [],
		getContainer: () => document.createElement('div'),
	})
	editor.createPage({ id: pageA, name: 'A' })
	editor.createPage({ id: pageB, name: 'B' })
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	warn.mockRestore()
	editor.dispose()
})

describe('TAB_ID', () => {
	it('is stable for the window and persisted to session storage on unload', () => {
		expect(TAB_ID).toEqual(expect.any(String))
		expect((window as any).TLDRAW_TAB_ID_v2).toBe(TAB_ID)

		window.dispatchEvent(new Event('beforeunload'))

		expect(getFromSessionStorage('TLDRAW_TAB_ID_v2')).toBe(TAB_ID)
	})
})

describe('createSessionStateSnapshotSignal', () => {
	it('is null when the store has no instance record', () => {
		const bare = createTLStore({})
		expect(createSessionStateSnapshotSignal(bare).get()).toBeNull()
	})

	it('captures one page state per page', () => {
		editor.setCurrentPage(pageB)
		editor.setCamera({ x: 10, y: 20, z: 2 })
		editor.updateInstanceState({ isGridMode: true, isDebugMode: true })

		const snapshot = createSessionStateSnapshotSignal(store).get()!
		expect(snapshot).toEqual({
			version: 0,
			currentPageId: pageB,
			exportBackground: true,
			isFocusMode: false,
			isDebugMode: true,
			isToolLocked: false,
			isGridMode: true,
			pageStates: expect.any(Array),
		})
		expect(snapshot.pageStates!.sort((a, b) => (a.pageId < b.pageId ? -1 : 1))).toEqual([
			{ pageId: pageA, camera: { x: 0, y: 0, z: 1 }, selectedShapeIds: [], focusedGroupId: null },
			{ pageId: pageB, camera: { x: 10, y: 20, z: 2 }, selectedShapeIds: [], focusedGroupId: null },
			{
				pageId: editor.getPages()[0].id,
				camera: { x: 0, y: 0, z: 1 },
				selectedShapeIds: [],
				focusedGroupId: null,
			},
		])
	})

	it('does not notify reactors for changes that leave the snapshot equal', () => {
		const $snapshot = createSessionStateSnapshotSignal(store)
		let runs = 0
		const stop = react('snapshot', () => {
			$snapshot.get()
			runs++
		})

		editor.updateInstanceState({ cursor: { type: 'grab', rotation: 0 } })
		editor.updateInstanceState({ isGridMode: false })
		expect(runs).toBe(1)

		editor.updateInstanceState({ isToolLocked: true })
		expect(runs).toBe(2)

		editor.createPage({ name: 'C' })
		expect(runs).toBe(3)
		stop()
	})
})

describe('loadSessionStateSnapshotIntoStore', () => {
	it('applies flags, current page, cameras and selections for known pages', () => {
		const shapeId = createShapeId('s')
		loadSessionStateSnapshotIntoStore(
			store,
			{
				version: 0,
				currentPageId: pageB,
				isGridMode: true,
				isToolLocked: true,
				pageStates: [
					{ pageId: pageA, camera: { x: 1, y: 2, z: 3 }, selectedShapeIds: [shapeId] },
					{ pageId: PageRecordType.createId('missing'), camera: { x: 9, y: 9, z: 9 } },
				],
			},
			{ forceOverwrite: true }
		)

		expect(editor.getInstanceState()).toMatchObject({
			currentPageId: pageB,
			isGridMode: true,
			isToolLocked: true,
			isDebugMode: false,
		})
		expect(store.get(CameraRecordType.createId(pageA))).toMatchObject({ x: 1, y: 2, z: 3 })
		// the store's integrity checks drop selections of shapes that do not exist
		expect(store.get(InstancePageStateRecordType.createId(pageA))).toMatchObject({
			pageId: pageA,
			selectedShapeIds: [],
			focusedGroupId: null,
		})
		expect(store.get(PageRecordType.createId('missing'))).toBeUndefined()
		expect(store.get(CameraRecordType.createId(PageRecordType.createId('missing')))).toBeUndefined()
	})

	it('keeps the previous camera and selection when a page state omits them', () => {
		editor.setCurrentPage(pageA)
		editor.setCamera({ x: 5, y: 6, z: 0.5 })

		loadSessionStateSnapshotIntoStore(store, {
			version: 0,
			pageStates: [{ pageId: pageA }],
		})

		expect(store.get(CameraRecordType.createId(pageA))).toMatchObject({ x: 5, y: 6, z: 0.5 })
	})

	it('prefers existing ui flags unless forceOverwrite is set', () => {
		editor.updateInstanceState({ isGridMode: true, isDebugMode: false })

		loadSessionStateSnapshotIntoStore(store, { version: 0, isGridMode: false, isDebugMode: true })
		expect(editor.getInstanceState()).toMatchObject({ isGridMode: true, isDebugMode: false })

		loadSessionStateSnapshotIntoStore(
			store,
			{ version: 0, isGridMode: false, isDebugMode: true },
			{ forceOverwrite: true }
		)
		expect(editor.getInstanceState()).toMatchObject({ isGridMode: false, isDebugMode: true })
	})

	it('migrates snapshots from other versions before applying them', () => {
		loadSessionStateSnapshotIntoStore(
			store,
			{ version: 99, isFocusMode: true },
			{ forceOverwrite: true }
		)

		expect(editor.getInstanceState().isFocusMode).toBe(true)
		expect(warn).not.toHaveBeenCalled()
	})

	it('does not mutate the caller snapshot while migrating', () => {
		const snapshot: TLSessionStateSnapshot = { version: -1, isFocusMode: true }
		loadSessionStateSnapshotIntoStore(store, snapshot, { forceOverwrite: true })
		expect(snapshot.version).toBe(-1)
		expect(editor.getInstanceState().isFocusMode).toBe(true)
	})

	it.each([
		['a non-object', 'nope' as unknown as TLSessionStateSnapshot, 'Invalid instance state'],
		['null', null as unknown as TLSessionStateSnapshot, 'Invalid instance state'],
		[
			'a snapshot without a version',
			{ isGridMode: true } as unknown as TLSessionStateSnapshot,
			'No version in instance state',
		],
	])('ignores %s', (_label, snapshot, message) => {
		const before = editor.getInstanceState()
		loadSessionStateSnapshotIntoStore(store, snapshot)

		expect(editor.getInstanceState()).toBe(before)
		expect(warn).toHaveBeenCalledWith(message)
	})

	it('ignores snapshots that fail validation', () => {
		const before = editor.getInstanceState()
		loadSessionStateSnapshotIntoStore(store, {
			version: 0,
			isGridMode: 'yes' as unknown as boolean,
		})

		expect(editor.getInstanceState()).toBe(before)
		expect(warn).toHaveBeenCalledWith(expect.any(Error))
	})
})

describe('extractSessionStateFromLegacySnapshot', () => {
	const legacyInstanceId = 'instance:legacy'
	const otherInstanceId = 'instance:other'

	function legacyStore() {
		return {
			[legacyInstanceId]: {
				id: legacyInstanceId,
				typeName: 'instance',
				currentPageId: pageA,
				exportBackground: 1,
				isFocusMode: true,
				isDebugMode: null,
				isToolLocked: 'locked',
			},
			'instance_page_state:a': {
				id: 'instance_page_state:a',
				typeName: 'instance_page_state',
				instanceId: legacyInstanceId,
				pageId: pageA,
				cameraId: 'camera:a',
				selectedShapeIds: [createShapeId('x')],
				focusedGroupId: null,
			},
			'instance_page_state:b': {
				id: 'instance_page_state:b',
				typeName: 'instance_page_state',
				instanceId: legacyInstanceId,
				pageId: pageB,
				cameraId: 'camera:missing',
				selectedShapeIds: [],
				focusedGroupId: createShapeId('g'),
			},
			'instance_page_state:other': {
				id: 'instance_page_state:other',
				typeName: 'instance_page_state',
				instanceId: otherInstanceId,
				pageId: pageA,
				cameraId: 'camera:a',
				selectedShapeIds: [],
				focusedGroupId: null,
			},
			'camera:a': { id: 'camera:a', typeName: 'camera', x: 3, y: 4, z: 5 },
			[pageA]: { id: pageA, typeName: 'page', name: 'A', index: 'a1' },
		} as any
	}

	it('returns null when there is no legacy instance record', () => {
		expect(extractSessionStateFromLegacySnapshot({})).toBeNull()
		expect(
			extractSessionStateFromLegacySnapshot({
				[TLINSTANCE_ID]: { id: TLINSTANCE_ID, typeName: 'instance' } as any,
			})
		).toBeNull()
	})

	it('builds a snapshot from the first legacy instance and its page states', () => {
		expect(extractSessionStateFromLegacySnapshot(legacyStore())).toEqual({
			version: 0,
			currentPageId: pageA,
			exportBackground: true,
			isFocusMode: true,
			isDebugMode: false,
			isToolLocked: true,
			isGridMode: false,
			pageStates: [
				{
					pageId: pageA,
					camera: { x: 3, y: 4, z: 5 },
					selectedShapeIds: [createShapeId('x')],
					focusedGroupId: null,
				},
				{
					pageId: pageB,
					camera: { x: 0, y: 0, z: 1 },
					selectedShapeIds: [],
					focusedGroupId: createShapeId('g'),
				},
			],
		})
	})

	it('returns null when the extracted snapshot is invalid', () => {
		const legacy = legacyStore()
		legacy[legacyInstanceId].currentPageId = 'not-a-page-id'
		expect(extractSessionStateFromLegacySnapshot(legacy)).toBeNull()
	})
})
