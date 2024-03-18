import { createRecordType, IdOf, RecordId, Store, StoreSchema, UnknownRecord } from '@tldraw/store'
import { assert, structuredClone } from '@tldraw/utils'
import fc, { Arbitrary } from 'fast-check'
import { NetworkDiff, ObjectDiff, RecordOpType, ValueOpType } from '../lib/diff'
import { TLSocketServerSentDataEvent } from '../lib/protocol'
import { squishDataEvents } from '../lib/squish'
import { _applyNetworkDiffToStore } from '../lib/TLSyncClient'

test('basic squishing', () => {
	const capture = [
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 929.58203125,
								h: 500.14453125,
							},
						],
					},
				],
			},
			serverClock: 9237,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						lastActivityTimestamp: ['put', 1710188679590],
						cursor: [
							'put',
							{
								x: 1526.07421875,
								y: 565.66796875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9238,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 916.046875,
								h: 494.20703125,
							},
						],
					},
				],
			},
			serverClock: 9239,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						lastActivityTimestamp: ['put', 1710188679599],
						cursor: [
							'put',
							{
								x: 1519.26171875,
								y: 563.71875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9240,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 909.234375,
								h: 492.2578125,
							},
						],
					},
				],
			},
			serverClock: 9241,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						lastActivityTimestamp: ['put', 1710188679608],
						cursor: [
							'put',
							{
								x: 1512.41015625,
								y: 562.23046875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9242,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 902.3828125,
								h: 490.76953125,
							},
						],
					},
				],
			},
			serverClock: 9243,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						lastActivityTimestamp: ['put', 1710188679617],
						cursor: [
							'put',
							{
								x: 1506.71484375,
								y: 561.29296875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9244,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 896.6875,
								h: 489.83203125,
							},
						],
					},
				],
			},
			serverClock: 9245,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						lastActivityTimestamp: ['put', 1710188679625],
						cursor: [
							'put',
							{
								x: 1501.734375,
								y: 560.88671875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9246,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 891.70703125,
								h: 489.42578125,
							},
						],
					},
				],
			},
			serverClock: 9247,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						lastActivityTimestamp: ['put', 1710188679633],
						cursor: [
							'put',
							{
								x: 1497.22265625,
								y: 560.6875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9248,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					RecordOpType.Patch,
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 887.1953125,
								h: 489.2265625,
							},
						],
					},
				],
			},
			serverClock: 9249,
		},
	] as const satisfies TLSocketServerSentDataEvent<UnknownRecord>[]

	const squished = squishDataEvents(capture)
	const manuallySquished = [
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679633],
						cursor: [
							'put',
							{
								x: 1497.22265625,
								y: 560.6875,
								rotation: 0,
								type: 'default',
							},
						],
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 887.1953125,
								h: 489.2265625,
							},
						],
					},
				],
			},
			serverClock: 9249,
		},
	]

	// see https://github.com/jestjs/jest/issues/14011 for why the second clone is needed
	expect(squished).toStrictEqual(structuredClone(manuallySquished))
})

const TEST_RECORD_TYPENAME = 'testRecord' as const

interface TestRecord extends UnknownRecord {
	fieldA?: TestRecordValue
	fieldB?: TestRecordValue
	fieldC?: TestRecordValue
}

type TestRecordValue =
	| string
	| number[]
	| { fieldA?: TestRecordValue; fieldB?: TestRecordValue; fieldC?: TestRecordValue }

const TestRecord = createRecordType<TestRecord>(TEST_RECORD_TYPENAME, {
	validator: {
		validate(value) {
			return value as TestRecord
		},
	},
	scope: 'document',
})

class Model {
	diffs: NetworkDiff<TestRecord>[] = []
	idMap: IdOf<TestRecord>[]
	private readonly initialStoreData: Record<IdOf<TestRecord>, TestRecord>

	constructor(public initialStoreContent: TestRecord[]) {
		this.idMap = initialStoreContent.map((r) => r.id)
		this.initialStoreData = Object.fromEntries(initialStoreContent.map((r) => [r.id, r]))
	}

	trueIdx(idx: number) {
		return idx % this.idMap.length
	}

	getId(idx: number) {
		return this.idMap[this.trueIdx(idx)]
	}

	private getFreshStore(): Store<TestRecord> {
		return new Store({
			initialData: this.initialStoreData,
			schema: StoreSchema.create<TestRecord>({ testRecord: TestRecord }),
			props: {},
		})
	}

	private getStoreWithDiffs(diffs: NetworkDiff<TestRecord>[]) {
		const store = this.getFreshStore()
		for (const diff of diffs) {
			const changes = _applyNetworkDiffToStore(diff, store)
			if (changes !== null) {
				store.applyDiff(changes, false)
			}
		}
		return store
	}

	runTest() {
		const dataEvents = this.diffs.map((diff, idx) => ({
			type: 'patch' as const,
			diff,
			serverClock: idx,
		}))
		const squishedDiffs = squishDataEvents(dataEvents).map((e) => {
			assert(e.type === 'patch')
			return e.diff
		})

		const baseStore = this.getStoreWithDiffs(this.diffs)
		const squishedStore = this.getStoreWithDiffs(squishedDiffs)

		// see https://github.com/jestjs/jest/issues/14011 for the explanation for that structuredClone
		expect(squishedStore.serialize()).toEqual(structuredClone(baseStore.serialize()))
	}

	// offsets are a MAJOR pain because they depend on the entire history of diffs so far, and
	// the store silently discards append patches if their offsets don't match, so they need
	// to be correct to exercise the squisher
	// NOTE: modifies the diff
	fixOffsets(recordId: IdOf<TestRecord>, fullDiff: ObjectDiff) {
		const fixed = structuredClone(fullDiff)

		const store = this.getStoreWithDiffs(this.diffs)
		const record = store.get(recordId)
		if (record === undefined) {
			return fixed
		}

		const fixer = (obj: any, diff: ObjectDiff) => {
			for (const [k, v] of Object.entries(diff)) {
				if (v[0] === ValueOpType.Append && Array.isArray(obj[k])) {
					v[2] = obj[k].length
				} else if (v[0] === ValueOpType.Patch && typeof obj[k] === 'object') {
					fixer(obj[k], v[1])
				}
			}
		}
		fixer(record, fixed)

		return fixed
	}
}

type Real = 'whatever'

class RecordPut implements fc.Command<Model, Real> {
	constructor(readonly record: TestRecord) {}
	check(_m: Readonly<Model>) {
		return true
	}
	run(m: Model): void {
		m.diffs.push({ [this.record.id]: [RecordOpType.Put, this.record] })
		m.idMap.push(this.record.id)

		m.runTest()
	}
	toString = () => `Put(${JSON.stringify(this.record)})`
}

class RecordRemove implements fc.Command<Model, Real> {
	constructor(readonly idx: number) {}
	check(m: Readonly<Model>) {
		return m.idMap.length > 0
	}
	run(m: Model) {
		m.diffs.push({ [m.getId(this.idx)]: [RecordOpType.Remove] })
		m.idMap.splice(m.trueIdx(this.idx), 1)

		m.runTest()
	}
	toString = () => `Remove(#${this.idx})`
}

class RecordPatch implements fc.Command<Model, Real> {
	constructor(
		readonly idx: number,
		readonly patch: ObjectDiff
	) {}
	check(m: Readonly<Model>) {
		return m.idMap.length > 0
	}
	run(m: Model) {
		const fixedPatch = m.fixOffsets(m.getId(this.idx), this.patch)
		m.diffs.push({ [m.getId(this.idx)]: [RecordOpType.Patch, fixedPatch] })

		m.runTest()
	}
	toString = () => `Patch(#${this.idx}, ${JSON.stringify(this.patch)})`
}

const { TestRecordValueArb }: { TestRecordValueArb: Arbitrary<TestRecordValue> } = fc.letrec(
	(tie) => ({
		TestRecordValueArb: fc.oneof(
			fc.string(),
			fc.array(fc.integer()),
			fc.record(
				{
					fieldA: tie('TestRecordValueArb'),
					fieldB: tie('TestRecordValueArb'),
					fieldC: tie('TestRecordValueArb'),
				},
				{ requiredKeys: ['fieldA'] }
			)
		),
	})
)

const TestRecordKeyArb = fc.oneof(
	fc.constant('fieldA' as const),
	fc.constant('fieldB' as const),
	fc.constant('fieldC' as const)
)

const TestRecordArb = fc.record(
	{
		id: fc.oneof(fc.constant('idA'), fc.constant('idB'), fc.constant('idC')) as Arbitrary<
			RecordId<TestRecord>
		>,
		typeName: fc.constant(TEST_RECORD_TYPENAME),
		fieldA: TestRecordValueArb,
		fieldB: TestRecordValueArb,
		fieldC: TestRecordValueArb,
	},
	{ requiredKeys: ['id', 'typeName'] }
)

const { ObjectDiffArb }: { ObjectDiffArb: Arbitrary<ObjectDiff> } = fc.letrec((tie) => ({
	ObjectDiffArb: fc.dictionary(
		TestRecordKeyArb,
		fc.oneof(
			fc.tuple(fc.constant(ValueOpType.Put), TestRecordValueArb),
			// The offset is -1 because it depends on the length of the array *in the current state*,
			// so it can't be generated here. Instead, it's patched up in the command
			fc.tuple(fc.constant(ValueOpType.Append), fc.array(fc.integer()), fc.constant(-1)),
			fc.tuple(fc.constant(ValueOpType.Patch), tie('ObjectDiffArb')),
			fc.tuple(fc.constant(ValueOpType.Delete))
		),
		{ minKeys: 1, maxKeys: 3 }
	),
}))

const allCommands = [
	TestRecordArb.map((r) => new RecordPut(r)),
	fc.nat(10).map((idx) => new RecordRemove(idx)),
	fc.tuple(fc.nat(), ObjectDiffArb).map(([idx, diff]) => new RecordPatch(idx, diff)),
]

const initialStoreContentArb: Arbitrary<TestRecord[]> = fc.uniqueArray(TestRecordArb, {
	selector: (r) => r.id,
	maxLength: 3,
})

test('fast-checking squish', () => {
	fc.assert(
		fc.property(
			initialStoreContentArb,
			fc.commands(allCommands, {}),
			(initialStoreContent, cmds) => {
				fc.modelRun(
					() => ({
						model: new Model(initialStoreContent),
						real: 'whatever',
					}),
					cmds
				)
			}
		),
		{
			verbose: 1,
			numRuns: 1_000,
		}
	)
})

test('problem: applying a patch to an array', () => {
	fc.assert(
		fc.property(
			initialStoreContentArb,
			fc.commands(allCommands, {
				replayPath: 'CDJ:F',
			}),
			(initialStoreContent, cmds) => {
				fc.modelRun(
					() => ({
						model: new Model(initialStoreContent),
						real: 'whatever',
					}),
					cmds
				)
			}
		),
		{ seed: -1883357795, path: '7653:1:2:2:4:3:3:3:3', endOnFailure: true }
	)
})
