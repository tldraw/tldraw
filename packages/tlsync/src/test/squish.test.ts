import { RecordId, UnknownRecord } from '@tldraw/store'
import { assert } from '@tldraw/utils'
import fc, { Arbitrary } from 'fast-check'
import { NetworkDiff, RecordOpType, ValueOpType } from '../lib/diff'
import { TLSocketServerSentDataEvent } from '../lib/protocol'
import { squishDataEvents } from '../lib/squish'

test('basic squishing', () => {
	const capture = [
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					'patch',
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
					},
				],
			},
			serverClock: 9248,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
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

	expect(squishDataEvents(capture as any)).toStrictEqual([
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
	])
})

interface TestRecord extends UnknownRecord {
	fieldA?: string | number[]
	fieldB?: string | number[]
	fieldC?: string | number[]
}

type Model = { records: TestRecord[]; diffs: NetworkDiff<TestRecord>[] }

type System = 'whatever'

class RecordPut implements fc.Command<Model, System> {
	constructor(readonly record: TestRecord) {}
	check(_m: Readonly<Model>) {
		return true
	}
	run(m: Model): void {
		m.diffs.push({ [this.record.id]: [RecordOpType.Put, this.record] })
		m.records.push(this.record)
	}
	toString = () => `Put(${this.record.id})`
}

class RecordRemove implements fc.Command<Model, System> {
	constructor(readonly idx: number) {}
	check(m: Readonly<Model>) {
		return m.records.length > 0
	}
	run(m: Model) {
		const trueIdx = this.idx % m.records.length
		m.diffs.push({ [m.records[trueIdx].id]: [RecordOpType.Remove] })
		m.records.splice(trueIdx, 1)
	}
	toString = () => `Remove(#${this.idx})`
}

class RecordPatchPut implements fc.Command<Model, System> {
	constructor(
		readonly idx: number,
		readonly key: Exclude<keyof TestRecord, keyof UnknownRecord>,
		readonly value: string | number[]
	) {}
	check(m: Readonly<Model>) {
		return m.records.length > 0
	}
	run(m: Model) {
		const trueIdx = this.idx % m.records.length
		m.diffs.push({
			[m.records[trueIdx].id]: [RecordOpType.Patch, { [this.key]: [ValueOpType.Put, this.value] }],
		})
		m.records[trueIdx][this.key] = this.value
	}
	toString = () => `PatchPut(#${this.idx}.${this.key}=${this.value})`
}

class RecordPatchAppend implements fc.Command<Model, System> {
	constructor(
		readonly idx: number,
		readonly key: Exclude<keyof TestRecord, keyof UnknownRecord>,
		readonly values: number[]
	) {}
	check(m: Readonly<Model>) {
		const trueIdx = this.idx % m.records.length
		return m.records.length > 0 && m.records[trueIdx][this.key] instanceof Array
	}
	run(m: Model) {
		const trueIdx = this.idx % m.records.length
		const arr = m.records[trueIdx][this.key]
		assert(arr instanceof Array)
		assert(arr.length < 2, `arr is ${arr}`)
		arr.push(...this.values)
		m.diffs.push({
			[m.records[trueIdx].id]: [
				RecordOpType.Patch,
				{ [this.key]: [ValueOpType.Append, this.values, arr.length] },
			],
		})
		arr.push(...this.values)
	}
	toString = () => `PatchAppend(#${this.idx}.${this.key}|=[${this.values}])`
}

class RecordPatchDelete implements fc.Command<Model, System> {
	constructor(
		readonly idx: number,
		readonly key: Exclude<keyof TestRecord, keyof UnknownRecord>
	) {}
	check(m: Readonly<Model>) {
		const trueIdx = this.idx % m.records.length
		return m.records.length > 0 && m.records[trueIdx][this.key] !== undefined
	}
	run(m: Model) {
		const trueIdx = this.idx % m.records.length
		delete m.records[trueIdx][this.key]
	}
	toString = () => `PatchDelete(#${this.idx}.${this.key})`
}

const TestRecordArb = fc.record(
	{
		id: fc.oneof(fc.constant('idA'), fc.constant('idB'), fc.constant('idC')) as Arbitrary<
			RecordId<TestRecord>
		>,
		typeName: fc.oneof(fc.constant('typeA'), fc.constant('typeB'), fc.constant('typeC')),
		alice: fc.oneof(fc.string(), fc.array(fc.nat(100))),
		bob: fc.oneof(fc.string(), fc.array(fc.nat(100))),
		charlie: fc.oneof(fc.string(), fc.array(fc.nat(100))),
	},
	{ requiredKeys: ['id', 'typeName'] }
)

const allCommands = [
	TestRecordArb.map((r) => new RecordPut(r)),
	fc.nat(10).map((idx) => new RecordRemove(idx)),
	fc
		.tuple(
			fc.nat(10),
			fc.oneof(
				fc.constant('fieldA' as const),
				fc.constant('fieldB' as const),
				fc.constant('fieldC' as const)
			),
			fc.oneof(fc.string(), fc.array(fc.integer()))
		)
		.map(([idx, key, value]) => new RecordPatchPut(idx, key, value)),
	fc
		.tuple(
			fc.nat(10),
			fc.oneof(
				fc.constant('fieldA' as const),
				fc.constant('fieldB' as const),
				fc.constant('fieldC' as const)
			),
			fc.array(fc.integer())
		)
		.map(([idx, key, values]) => new RecordPatchAppend(idx, key, values)),
	fc
		.tuple(
			fc.nat(10),
			fc.oneof(
				fc.constant('fieldA' as const),
				fc.constant('fieldB' as const),
				fc.constant('fieldC' as const)
			)
		)
		.map(([idx, key]) => new RecordPatchDelete(idx, key)),
]

test('fast-checking squish', () =>
	fc.assert(
		fc.property(fc.commands(allCommands, { replayPath: 'ACACBF:q' }), (cmds) => {
			fc.modelRun(() => ({ model: { records: [], diffs: [] }, real: 'whatever' }), cmds)
		}),
		{ verbose: 1 }
	))
