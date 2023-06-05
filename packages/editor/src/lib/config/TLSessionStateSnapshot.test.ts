import { react } from 'signia'
import { TestEditor } from '../test/TestEditor'
import {
	TLSessionStateSnapshot,
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
} from './TLSessionStateSnapshot'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})

describe('createSessionStateSnapshotSignal', () => {
	it('creates a signal', () => {
		const $snapshot = createSessionStateSnapshotSignal(app.store)

		expect($snapshot.value).toMatchObject({
			exportBackground: true,
			isDebugMode: false,
			isFocusMode: false,
			isGridMode: false,
			isToolLocked: false,
			pageStates: [
				{
					camera: {
						x: 0,
						y: 0,
						z: 1,
					},
					focusLayerId: null,
					selectedIds: [],
				},
			],
			version: 0,
		})
	})

	it('creates a signal that can be reacted to', () => {
		const $snapshot = createSessionStateSnapshotSignal(app.store)

		let isGridMode = false
		let numPages = 0

		react('', () => {
			isGridMode = $snapshot.value?.isGridMode ?? false
			numPages = $snapshot.value?.pageStates.length ?? 0
		})

		expect(isGridMode).toBe(false)
		expect(numPages).toBe(1)

		app.setGridMode(true)

		expect(isGridMode).toBe(true)
		expect(numPages).toBe(1)

		app.createPage('new page')

		expect(isGridMode).toBe(true)
		expect(app.pages.length).toBe(2)
		expect(numPages).toBe(2)
	})
})

describe(loadSessionStateSnapshotIntoStore, () => {
	it('loads a snapshot into the store', () => {
		let snapshot = createSessionStateSnapshotSignal(app.store).value
		if (!snapshot) throw new Error('snapshot is null')

		expect(app.isGridMode).toBe(false)
		expect(app.camera.x).toBe(0)
		expect(app.camera.y).toBe(0)

		snapshot = JSON.parse(JSON.stringify(snapshot)) as TLSessionStateSnapshot

		snapshot.isGridMode = true
		snapshot.pageStates[0].camera.x = 1
		snapshot.pageStates[0].camera.y = 2

		loadSessionStateSnapshotIntoStore(app.store, snapshot)

		expect(app.isGridMode).toBe(true)
		expect(app.camera.x).toBe(1)
		expect(app.camera.y).toBe(2)
	})
})

describe(extractSessionStateFromLegacySnapshot, () => {
	it('pulls a snapshot from old data if it can', () => {
		const oldSnapshot = {
			'shape:whatever': {
				id: 'shape:whatever',
				typeName: 'shape',
			},
			'camera:whatever': {
				id: 'camera:whatever',
				typeName: 'camera',
				x: 1,
				y: 2,
				z: 3,
			},
			'page:whatever': {
				id: 'page:whatever',
				typeName: 'page',
				name: 'whatever',
				index: 'whatever',
			},
			'instance:whatever': {
				id: 'instance:whatever',
				typeName: 'instance',
				currentPageId: 'page:whatever',
			},
			'instance_page_state:whatever': {
				id: 'instance_page_state:whatever',
				typeName: 'instance_page_state',
				instanceId: 'instance:whatever',
				pageId: 'page:whatever',
				selectedIds: ['shape:whatever'],
				focusLayerId: null,
			},
		}

		expect(extractSessionStateFromLegacySnapshot(oldSnapshot as any)).toMatchInlineSnapshot(`
		Object {
		  "currentPageId": "page:whatever",
		  "exportBackground": false,
		  "isDebugMode": false,
		  "isFocusMode": false,
		  "isGridMode": false,
		  "isToolLocked": false,
		  "pageStates": Array [
		    Object {
		      "camera": Object {
		        "x": 0,
		        "y": 0,
		        "z": 1,
		      },
		      "focusLayerId": null,
		      "pageId": "page:whatever",
		      "selectedIds": Array [
		        "shape:whatever",
		      ],
		    },
		  ],
		  "version": 0,
		}
	`)
	})
})
