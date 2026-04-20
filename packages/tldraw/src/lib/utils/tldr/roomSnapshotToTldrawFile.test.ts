import {
	AssetRecordType,
	InstancePresenceRecordType,
	TLArrowBinding,
	TLRecord,
	UnknownRecord,
	createShapeId,
} from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { parseTldrawJsonFile } from './file'
import { RoomSnapshotLike, roomSnapshotToTldrawFile } from './roomSnapshotToTldrawFile'

function buildSnapshot(editor: TestEditor, extra: UnknownRecord[] = []): RoomSnapshotLike {
	const documents = [...editor.store.allRecords(), ...extra].map((state) => ({
		state,
		lastChangedClock: 0,
	}))
	return {
		clock: documents.length,
		documentClock: documents.length,
		documents,
		schema: editor.store.schema.serialize(),
	}
}

describe('roomSnapshotToTldrawFile', () => {
	const shapeId = createShapeId('shape1')
	const arrowId = createShapeId('arrow1')
	const usedAssetId = AssetRecordType.createId('used')
	const orphanAssetId = AssetRecordType.createId('orphan')

	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
		editor.createAssets([
			{
				type: 'image',
				id: usedAssetId,
				typeName: 'asset',
				props: {
					w: 100,
					h: 100,
					name: 'used.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/used.png',
				},
				meta: {},
			},
			{
				type: 'image',
				id: orphanAssetId,
				typeName: 'asset',
				props: {
					w: 10,
					h: 10,
					name: 'orphan.png',
					isAnimated: false,
					mimeType: 'image/png',
					src: 'https://example.com/orphan.png',
				},
				meta: {},
			},
		])
		editor.createShapes([
			{
				id: shapeId,
				type: 'image',
				x: 0,
				y: 0,
				props: { w: 100, h: 100, assetId: usedAssetId },
			},
			{ id: arrowId, type: 'arrow', x: 200, y: 0 },
		])
	})

	it('keeps only persistent record types and drops session-scoped ones', () => {
		const presence = InstancePresenceRecordType.create({
			id: InstancePresenceRecordType.createId('p1'),
			currentPageId: editor.getCurrentPageId(),
			userId: 'user-1',
			userName: 'remote',
		})
		const snapshot = buildSnapshot(editor, [presence])

		// sanity: the input contains all the session-scoped types we expect to be dropped
		const inputTypeNames = new Set(snapshot.documents.map((d) => d.state.typeName))
		for (const t of ['instance', 'instance_page_state', 'instance_presence', 'camera', 'pointer']) {
			expect(inputTypeNames.has(t)).toBe(true)
		}

		const file = roomSnapshotToTldrawFile(snapshot)
		const outTypeNames = new Set(file.records.map((r) => r.typeName))
		const persistent = new Set(['document', 'page', 'shape', 'asset', 'binding'])

		for (const t of outTypeNames) {
			expect(persistent.has(t)).toBe(true)
		}
		for (const t of [
			'instance',
			'instance_page_state',
			'instance_presence',
			'camera',
			'pointer',
			'user',
		]) {
			expect(outTypeNames.has(t)).toBe(false)
		}
	})

	it('prunes asset records not referenced by a surviving shape', () => {
		const file = roomSnapshotToTldrawFile(buildSnapshot(editor))
		const assetIds = file.records.filter((r) => r.typeName === 'asset').map((r) => r.id)

		expect(assetIds).toContain(usedAssetId)
		expect(assetIds).not.toContain(orphanAssetId)
	})

	it('keeps bindings on surviving records', () => {
		editor.createBinding<TLArrowBinding>({
			type: 'arrow',
			fromId: arrowId,
			toId: shapeId,
			props: {
				terminal: 'start',
				isPrecise: false,
				isExact: false,
				normalizedAnchor: { x: 0.5, y: 0.5 },
			},
		})

		const file = roomSnapshotToTldrawFile(buildSnapshot(editor))
		const bindings = file.records.filter((r) => r.typeName === 'binding')
		expect(bindings).toHaveLength(1)
	})

	it('round-trips through parseTldrawJsonFile without validation errors', () => {
		const file = roomSnapshotToTldrawFile(buildSnapshot(editor))
		const result = parseTldrawJsonFile({
			json: JSON.stringify(file),
			schema: editor.store.schema,
		})

		expect(result.ok).toBe(true)
		if (!result.ok) return

		const loaded = result.value.allRecords() as TLRecord[]
		const loadedShapeIds = new Set(loaded.filter((r) => r.typeName === 'shape').map((r) => r.id))
		expect(loadedShapeIds.has(shapeId)).toBe(true)
		expect(loadedShapeIds.has(arrowId)).toBe(true)
	})

	it('throws when the snapshot is missing a schema', () => {
		expect(() => roomSnapshotToTldrawFile({ documents: [], schema: undefined })).toThrow(
			/missing a schema/
		)
	})
})
