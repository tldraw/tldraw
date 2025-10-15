import { describe, expect, it } from 'vitest'
import {
	applyObjectDiff,
	diffRecord,
	getNetworkDiff,
	RecordOpType,
	ValueOpType,
	type ObjectDiff,
} from '../lib/diff'

describe('nested arrays', () => {
	it('should be patchable at the end', () => {
		const a = {
			arr: [
				[1, 2, 3],
				[4, 5, 6],
			],
		}
		const b = {
			arr: [
				[1, 2, 3],
				[4, 5, 6, 7, 8],
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		{
		  "arr": [
		    "patch",
		    {
		      "1": [
		        "append",
		        [
		          7,
		          8,
		        ],
		        3,
		      ],
		    },
		  ],
		}
	`)
	})

	it('should be patchable at the beginning', () => {
		const a = {
			arr: [
				[1, 2, 3],
				[4, 5, 6],
			],
		}
		const b = {
			arr: [
				[1, 2, 3, 4, 5, 6],
				[4, 5, 6],
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		{
		  "arr": [
		    "patch",
		    {
		      "0": [
		        "append",
		        [
		          4,
		          5,
		          6,
		        ],
		        3,
		      ],
		    },
		  ],
		}
	`)
	})
})

describe('objects inside arrays', () => {
	it('should be patchable if only item changes', () => {
		const a = {
			arr: [
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 6 },
			],
		}
		const b = {
			arr: [
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 7 },
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		      {
		        "arr": [
		          "patch",
		          {
		            "1": [
		              "patch",
		              {
		                "c": [
		                  "put",
		                  7,
		                ],
		              },
		            ],
		          },
		        ],
		      }
	    `)
	})

	it('should return a put op if many items change', () => {
		const a = {
			arr: [
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 6 },
			],
		}
		const b = {
			arr: [
				{ a: 1, b: 2, c: 5 },
				{ a: 4, b: 5, c: 7 },
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		{
		  "arr": [
		    "put",
		    [
		      {
		        "a": 1,
		        "b": 2,
		        "c": 5,
		      },
		      {
		        "a": 4,
		        "b": 5,
		        "c": 7,
		      },
		    ],
		  ],
		}
	`)
	})
})

test('deleting things from a record', () => {
	const a = {
		a: 1,
		b: 2,
		c: 3,
	}
	const b = {
		a: 1,
		b: 2,
	}

	const patch = diffRecord(a, b)
	expect(patch).toMatchInlineSnapshot(`
		{
		  "c": [
		    "delete",
		  ],
		}
	`)

	expect(applyObjectDiff(a, patch!)).toEqual(b)
})

test('adding things things to a record', () => {
	const a = {
		a: 1,
		b: 2,
	}
	const b = {
		a: 1,
		b: 2,
		c: 3,
	}

	const patch = diffRecord(a, b)

	expect(patch).toMatchInlineSnapshot(`
		{
		  "c": [
		    "put",
		    3,
		  ],
		}
	`)

	expect(applyObjectDiff(a, patch!)).toEqual(b)
})

describe('getNetworkDiff', () => {
	it('should return null for empty diff', () => {
		const diff = { added: {}, updated: {}, removed: {} }
		expect(getNetworkDiff(diff)).toBeNull()
	})

	it('should handle added records', () => {
		const record = { id: 'test:1', type: 'test', data: 'value' }
		const diff = {
			added: { 'test:1': record },
			updated: {},
			removed: {},
		}

		const networkDiff = getNetworkDiff(diff)
		expect(networkDiff).toEqual({
			'test:1': [RecordOpType.Put, record],
		})
	})

	it('should handle removed records', () => {
		const diff = {
			added: {},
			updated: {},
			removed: { 'test:1': { id: 'test:1', type: 'test' } },
		}

		const networkDiff = getNetworkDiff(diff)
		expect(networkDiff).toEqual({
			'test:1': [RecordOpType.Remove],
		})
	})

	it('should handle updated records with patches', () => {
		const prev = { id: 'test:1', type: 'test', x: 100, y: 200 }
		const next = { id: 'test:1', type: 'test', x: 150, y: 200 }
		const diff = {
			added: {},
			updated: { 'test:1': [prev, next] },
			removed: {},
		}

		const networkDiff = getNetworkDiff(diff)
		expect(networkDiff).toEqual({
			'test:1': [RecordOpType.Patch, { x: [ValueOpType.Put, 150] }],
		})
	})

	it('should skip updates when no diff exists', () => {
		const record = { id: 'test:1', type: 'test', x: 100 }
		const diff = {
			added: {},
			updated: { 'test:1': [record, record] },
			removed: {},
		}

		const networkDiff = getNetworkDiff(diff)
		expect(networkDiff).toBeNull()
	})

	it('should handle mixed operations', () => {
		const addedRecord = { id: 'test:1', type: 'test', data: 'new' }
		const prevRecord = { id: 'test:2', type: 'test', x: 100 }
		const nextRecord = { id: 'test:2', type: 'test', x: 200 }
		const removedRecord = { id: 'test:3', type: 'test' }

		const diff = {
			added: { 'test:1': addedRecord },
			updated: { 'test:2': [prevRecord, nextRecord] },
			removed: { 'test:3': removedRecord },
		}

		const networkDiff = getNetworkDiff(diff)
		expect(networkDiff).toEqual({
			'test:1': [RecordOpType.Put, addedRecord],
			'test:2': [RecordOpType.Patch, { x: [ValueOpType.Put, 200] }],
			'test:3': [RecordOpType.Remove],
		})
	})
})

describe('diffRecord comprehensive tests', () => {
	it('should return null for identical records', () => {
		const record = { id: 'test:1', x: 100, y: 200 }
		expect(diffRecord(record, record)).toBeNull()
	})

	it('should handle simple property changes', () => {
		const prev = { id: 'test:1', x: 100, y: 200 }
		const next = { id: 'test:1', x: 150, y: 200 }

		expect(diffRecord(prev, next)).toEqual({
			x: [ValueOpType.Put, 150],
		})
	})

	it('should handle nested props changes', () => {
		const prev = { id: 'test:1', props: { color: 'red', size: 'medium' } }
		const next = { id: 'test:1', props: { color: 'blue', size: 'medium' } }

		expect(diffRecord(prev, next)).toEqual({
			props: [ValueOpType.Patch, { color: [ValueOpType.Put, 'blue'] }],
		})
	})

	it('should handle adding nested props', () => {
		const prev = { id: 'test:1', props: { color: 'red' } }
		const next = { id: 'test:1', props: { color: 'red', size: 'large' } }

		expect(diffRecord(prev, next)).toEqual({
			props: [ValueOpType.Patch, { size: [ValueOpType.Put, 'large'] }],
		})
	})

	it('should handle removing nested props', () => {
		const prev = { id: 'test:1', props: { color: 'red', size: 'large' } }
		const next = { id: 'test:1', props: { color: 'red' } }

		expect(diffRecord(prev, next)).toEqual({
			props: [ValueOpType.Patch, { size: [ValueOpType.Delete] }],
		})
	})

	it('should handle multiple property changes', () => {
		const prev = { id: 'test:1', x: 100, y: 200, rotation: 0 }
		const next = { id: 'test:1', x: 150, y: 250, rotation: 45 }

		expect(diffRecord(prev, next)).toEqual({
			x: [ValueOpType.Put, 150],
			y: [ValueOpType.Put, 250],
			rotation: [ValueOpType.Put, 45],
		})
	})

	it('should handle null and undefined values', () => {
		const prev = { id: 'test:1', optional: 'value', nullable: null }
		const next = { id: 'test:1', optional: undefined, nullable: 'value' }

		const diff = diffRecord(prev, next)
		expect(diff).toBeTruthy()
		expect(diff!.optional).toEqual([ValueOpType.Put, undefined])
		expect(diff!.nullable).toEqual([ValueOpType.Put, 'value'])
	})
})

describe('array diffing comprehensive', () => {
	describe('simple arrays', () => {
		it('should handle identical arrays', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 2, 3] }

			expect(diffRecord(prev, next)).toBeNull()
		})

		it('should handle array appends', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 2, 3, 4, 5] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Append, [4, 5], 3],
			})
		})

		it('should replace array when prefix changes', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 3, 4] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [1, 3, 4]],
			})
		})

		it('should patch few items in same-length arrays', () => {
			const prev = { arr: [1, 2, 3, 4, 5] }
			const next = { arr: [1, 9, 3, 4, 5] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Patch, { '1': [ValueOpType.Put, 9] }],
			})
		})

		it('should replace array when too many items change', () => {
			const prev = { arr: [1, 2, 3, 4, 5] }
			const next = { arr: [6, 7, 8, 9, 10] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [6, 7, 8, 9, 10]],
			})
		})
	})

	describe('empty arrays', () => {
		it('should handle empty to non-empty', () => {
			const prev = { arr: [] }
			const next = { arr: [1, 2, 3] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Append, [1, 2, 3], 0],
			})
		})

		it('should handle non-empty to empty', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, []],
			})
		})
	})
})

describe('applyObjectDiff comprehensive', () => {
	describe('basic operations', () => {
		it('should create new object when changes are needed', () => {
			const obj = { a: 1, b: 2 }
			const diff: ObjectDiff = { a: [ValueOpType.Put, 5] }

			const result = applyObjectDiff(obj, diff)
			expect(result).not.toBe(obj)
			expect(result).toEqual({ a: 5, b: 2 })
		})

		it('should handle put operations', () => {
			const obj = { a: 1, b: 2 }
			const diff: ObjectDiff = {
				a: [ValueOpType.Put, 10],
				c: [ValueOpType.Put, 30],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ a: 10, b: 2, c: 30 })
		})

		it('should handle delete operations', () => {
			const obj = { a: 1, b: 2, c: 3 }
			const diff: ObjectDiff = { b: [ValueOpType.Delete] }

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ a: 1, c: 3 })
			expect('b' in result).toBe(false)
		})
	})

	describe('nested patch operations', () => {
		it('should handle nested object patches', () => {
			const obj = { a: 1, nested: { x: 10, y: 20 } }
			const diff: ObjectDiff = {
				nested: [ValueOpType.Patch, { x: [ValueOpType.Put, 100] }],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ a: 1, nested: { x: 100, y: 20 } })
			expect(result.nested).not.toBe(obj.nested)
		})

		it('should handle deeply nested patches', () => {
			const obj = {
				level1: {
					level2: {
						level3: { value: 'old' },
					},
				},
			}
			const diff: ObjectDiff = {
				level1: [
					ValueOpType.Patch,
					{
						level2: [
							ValueOpType.Patch,
							{
								level3: [
									ValueOpType.Patch,
									{
										value: [ValueOpType.Put, 'new'],
									},
								],
							},
						],
					},
				],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result.level1.level2.level3.value).toBe('new')
		})
	})

	describe('array operations', () => {
		it('should handle array append operations', () => {
			const obj = { arr: [1, 2, 3] }
			const diff: ObjectDiff = {
				arr: [ValueOpType.Append, [4, 5], 3],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ arr: [1, 2, 3, 4, 5] })
		})

		it('should handle array patch operations', () => {
			const obj = { arr: [{ a: 1 }, { b: 2 }, { c: 3 }] }
			const diff: ObjectDiff = {
				arr: [
					ValueOpType.Patch,
					{
						'1': [ValueOpType.Patch, { b: [ValueOpType.Put, 20] }],
					},
				],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result.arr[1]).toEqual({ b: 20 })
			expect(result.arr[0]).toBe(obj.arr[0]) // Unchanged items should be same reference
		})
	})

	describe('edge cases', () => {
		it('should handle empty diffs', () => {
			const obj = { a: 1, b: 2 }
			const diff: ObjectDiff = {}

			const result = applyObjectDiff(obj, diff)
			expect(result).toBe(obj) // Should be same reference
		})
	})
})

describe('complex scenarios', () => {
	it('should handle shape-like record updates', () => {
		const prev = {
			id: 'shape:123',
			type: 'geo',
			x: 100,
			y: 200,
			props: {
				color: 'red',
				size: 'medium',
				geo: 'rectangle',
			},
			meta: {},
		}

		const next = {
			id: 'shape:123',
			type: 'geo',
			x: 150,
			y: 200,
			props: {
				color: 'blue',
				size: 'medium',
				geo: 'rectangle',
			},
			meta: { timestamp: Date.now() },
		}

		const diff = diffRecord(prev, next)
		expect(diff).toBeTruthy()
		expect(diff!.x).toEqual([ValueOpType.Put, 150])
		expect(diff!.props).toEqual([ValueOpType.Patch, { color: [ValueOpType.Put, 'blue'] }])
		expect(diff!.meta).toBeTruthy()

		// Apply the diff and verify result
		const result = applyObjectDiff(prev, diff!)
		expect(result).toEqual(next)
	})

	it('should handle complete network diff workflow', () => {
		const shape1 = { id: 'shape:1', type: 'geo', x: 100 }
		const shape2prev = { id: 'shape:2', type: 'geo', x: 200 }
		const shape2next = { id: 'shape:2', type: 'geo', x: 300 }
		const shape3 = { id: 'shape:3', type: 'geo', x: 400 }

		const recordsDiff = {
			added: { 'shape:1': shape1 },
			updated: { 'shape:2': [shape2prev, shape2next] },
			removed: { 'shape:3': shape3 },
		}

		const networkDiff = getNetworkDiff(recordsDiff)
		expect(networkDiff).toEqual({
			'shape:1': [RecordOpType.Put, shape1],
			'shape:2': [RecordOpType.Patch, { x: [ValueOpType.Put, 300] }],
			'shape:3': [RecordOpType.Remove],
		})
	})
})
