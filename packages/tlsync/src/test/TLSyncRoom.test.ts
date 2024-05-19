import { SerializedSchemaV2 } from '@tldraw/store'
import {
	CameraRecordType,
	DocumentRecordType,
	InstancePageStateRecordType,
	PageRecordType,
	TLArrowShape,
	TLArrowShapeProps,
	TLBaseShape,
	TLRecord,
	TLShapeId,
	createTLSchema,
} from '@tldraw/tlschema'
import { ZERO_INDEX_KEY, sortById } from '@tldraw/utils'
import {
	MAX_TOMBSTONES,
	RoomSnapshot,
	TLSyncRoom,
	TOMBSTONE_PRUNE_BUFFER_SIZE,
} from '../lib/TLSyncRoom'
import { schema } from '../lib/schema'

const compareById = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)

const records = [
	DocumentRecordType.create({}),
	PageRecordType.create({ index: ZERO_INDEX_KEY, name: 'page 2' }),
].sort(compareById)

const makeSnapshot = (records: TLRecord[], others: Partial<RoomSnapshot> = {}) => ({
	documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
	clock: 0,
	...others,
})

const oldArrow: TLBaseShape<'arrow', Omit<TLArrowShapeProps, 'labelColor'>> = {
	typeName: 'shape',
	type: 'arrow',
	id: 'shape:old_arrow' as TLShapeId,
	index: ZERO_INDEX_KEY,
	isLocked: false,
	parentId: PageRecordType.createId(),
	rotation: 0,
	x: 0,
	y: 0,
	opacity: 1,
	props: {
		dash: 'draw',
		size: 'm',
		fill: 'none',
		color: 'black',
		bend: 0,
		start: { x: 0, y: 0 },
		end: { x: 0, y: 0 },
		arrowheadStart: 'none',
		arrowheadEnd: 'arrow',
		text: '',
		font: 'draw',
		labelPosition: 0.5,
	},
	meta: {},
}

describe('TLSyncRoom', () => {
	it('can be constructed with a schema alone', () => {
		const room = new TLSyncRoom<any>(schema)

		// we populate the store with a default document if none is given
		expect(room.getSnapshot().documents.length).toBeGreaterThan(0)
	})

	it('can be constructed with a snapshot', () => {
		const room = new TLSyncRoom<TLRecord>(schema, makeSnapshot(records))

		expect(
			room
				.getSnapshot()
				.documents.map((r) => r.state)
				.sort(sortById)
		).toEqual(records)

		expect(room.getSnapshot().documents.map((r) => r.lastChangedClock)).toEqual([0, 0])
	})

	it('trims tombstones down if you pass too many in the snapshot', () => {
		const room = new TLSyncRoom(schema, {
			documents: [],
			clock: MAX_TOMBSTONES + 100,
			tombstones: Object.fromEntries(
				Array.from({ length: MAX_TOMBSTONES + 100 }, (_, i) => [PageRecordType.createId(), i])
			),
		})

		expect(Object.keys(room.getSnapshot().tombstones ?? {})).toHaveLength(
			MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE
		)
	})

	it('migrates the snapshot if it is dealing with old data', () => {
		const serializedSchema = schema.serialize()
		const oldSerializedSchema: SerializedSchemaV2 = {
			schemaVersion: 2,
			sequences: {
				...serializedSchema.sequences,
				'com.tldraw.shape.arrow': 0,
			},
		}

		const room = new TLSyncRoom(
			schema,
			makeSnapshot([...records, oldArrow], {
				schema: oldSerializedSchema,
			})
		)

		const arrow = room.getSnapshot().documents.find((r) => r.state.id === oldArrow.id)
			?.state as TLArrowShape
		expect(arrow.props.labelColor).toBe('black')
	})

	it('filters out instance state records', () => {
		const schema = createTLSchema({ shapes: {} })
		const room = new TLSyncRoom(
			schema,
			makeSnapshot([
				...records,
				schema.types.instance.create({
					currentPageId: PageRecordType.createId('page_1'),
					id: schema.types.instance.createId('instance_1'),
				}),
				InstancePageStateRecordType.create({
					id: InstancePageStateRecordType.createId(PageRecordType.createId('page_1')),
					pageId: PageRecordType.createId('page_1'),
				}),
				CameraRecordType.create({
					id: CameraRecordType.createId('camera_1'),
				}),
			])
		)

		expect(
			room
				.getSnapshot()
				.documents.map((r) => r.state)
				.sort(sortById)
		).toEqual(records)
	})
})
