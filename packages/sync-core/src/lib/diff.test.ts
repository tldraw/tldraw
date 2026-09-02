import {
	applyObjectDiff,
	diffRecord,
	getNetworkDiff,
	RecordOpType,
	ValueOpType,
	type ObjectDiff,
} from './diff'

describe('computing diffs (D)', () => {
	describe('no changes (D1)', () => {
		it('[D1] returns null when prev === next', () => {
			const record = { id: 'test:1', x: 100, y: 200 }
			expect(diffRecord(record, record)).toBeNull()
		})

		it('[D1] returns null when there is nothing to change', () => {
			const prev = { id: 'test:1', x: 100, props: { color: 'red' }, arr: [1, 2, 3], text: 'hi' }
			const next = { id: 'test:1', x: 100, props: { color: 'red' }, arr: [1, 2, 3], text: 'hi' }
			expect(diffRecord(prev, next)).toBeNull()
		})
	})

	describe('added and deleted keys (D2)', () => {
		it('[D2] produces a delete op for keys missing from next', () => {
			const a = { a: 1, b: 2, c: 3 }
			const b = { a: 1, b: 2 }

			const patch = diffRecord(a, b)
			expect(patch).toEqual({ c: [ValueOpType.Delete] })
			expect(applyObjectDiff(a, patch!)).toEqual(b)
		})

		it('[D2] produces a put op for keys added in next', () => {
			const a = { a: 1, b: 2 }
			const b = { a: 1, b: 2, c: 3 }

			const patch = diffRecord(a, b)
			expect(patch).toEqual({ c: [ValueOpType.Put, 3] })
			expect(applyObjectDiff(a, patch!)).toEqual(b)
		})
	})

	describe('top-level keys vs props/meta (D3)', () => {
		it('[D3] puts changed top-level primitive values', () => {
			const prev = { id: 'test:1', x: 100, y: 200 }
			const next = { id: 'test:1', x: 150, y: 200 }

			expect(diffRecord(prev, next)).toEqual({
				x: [ValueOpType.Put, 150],
			})
		})

		it('[D3] puts multiple changed top-level values', () => {
			const prev = { id: 'test:1', x: 100, y: 200, rotation: 0 }
			const next = { id: 'test:1', x: 150, y: 250, rotation: 45 }

			expect(diffRecord(prev, next)).toEqual({
				x: [ValueOpType.Put, 150],
				y: [ValueOpType.Put, 250],
				rotation: [ValueOpType.Put, 45],
			})
		})

		it('[D3] a top-level key (not props/meta) holding a plain object gets a whole-value put, never a patch', () => {
			const prev = { id: 'test:1', custom: { a: 1, b: 2 } }
			const next = { id: 'test:1', custom: { a: 1, b: 3 } }

			expect(diffRecord(prev, next)).toEqual({
				custom: [ValueOpType.Put, { a: 1, b: 3 }],
			})
		})

		it('[D3] a deep-equal top-level plain object produces no diff', () => {
			const prev = { id: 'test:1', custom: { a: 1, b: 2 } }
			const next = { id: 'test:1', custom: { a: 1, b: 2 } }

			expect(diffRecord(prev, next)).toBeNull()
		})

		it('[D3] changes inside props are expressed as patch ops', () => {
			const prev = { id: 'test:1', props: { color: 'red', size: 'medium' } }
			const next = { id: 'test:1', props: { color: 'blue', size: 'medium' } }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Patch, { color: [ValueOpType.Put, 'blue'] }],
			})
		})

		it('[D3] changes inside meta are expressed as patch ops', () => {
			const prev = { id: 'test:1', meta: { tag: 'a' } }
			const next = { id: 'test:1', meta: { tag: 'b' } }

			expect(diffRecord(prev, next)).toEqual({
				meta: [ValueOpType.Patch, { tag: [ValueOpType.Put, 'b'] }],
			})
		})

		it('[D3] handles null and undefined values at the top level', () => {
			const prev = { id: 'test:1', optional: 'value', nullable: null }
			const next = { id: 'test:1', optional: undefined, nullable: 'value' }

			const diff = diffRecord(prev, next)
			expect(diff).toBeTruthy()
			expect(diff!.optional).toEqual([ValueOpType.Put, undefined])
			expect(diff!.nullable).toEqual([ValueOpType.Put, 'value'])
		})
	})

	describe('nested diffs (D4)', () => {
		it('[D4] recursively patches object values inside props', () => {
			const prev = { id: 'test:1', props: { color: 'red' } }
			const next = { id: 'test:1', props: { color: 'red', size: 'large' } }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Patch, { size: [ValueOpType.Put, 'large'] }],
			})
		})

		it('[D4] deletes keys removed inside props', () => {
			const prev = { id: 'test:1', props: { color: 'red', size: 'large' } }
			const next = { id: 'test:1', props: { color: 'red' } }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Patch, { size: [ValueOpType.Delete] }],
			})
		})

		it('[D4] puts primitive values when the props key holds a primitive', () => {
			const prev = { id: 'shape:1', props: 'hello' }
			const next = { id: 'shape:1', props: 'world' }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Put, 'world'],
			})
		})

		it('[D4] [D5] appends when the props key holds a growing string', () => {
			const prev = { id: 'shape:1', props: 'hello' }
			const next = { id: 'shape:1', props: 'hello world' }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Append, ' world', 5],
			})
		})

		it('[D4] puts number values when the props key holds a number', () => {
			const prev = { id: 'shape:1', props: 42 }
			const next = { id: 'shape:1', props: 100 }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Put, 100],
			})
		})

		it('[D4] still patches object values inside props normally', () => {
			const prev = { id: 'shape:1', props: { color: 'red' } }
			const next = { id: 'shape:1', props: { color: 'blue' } }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Patch, { color: [ValueOpType.Put, 'blue'] }],
			})
		})
	})

	describe('string appends (D5)', () => {
		it('[D5] top-level string fields outside props get append ops', () => {
			expect(diffRecord({ id: 'a', text: 'hello' }, { id: 'a', text: 'hello world' })).toEqual({
				text: [ValueOpType.Append, ' world', 5],
			})
		})

		it('[D5] appends from an empty string', () => {
			const prev = { text: '' }
			const next = { text: 'Hello' }

			expect(diffRecord(prev, next)).toEqual({
				text: [ValueOpType.Append, 'Hello', 0],
			})
		})

		it('[D5] uses put when the string is replaced rather than appended', () => {
			const prev = { text: 'Hello' }
			const next = { text: 'Goodbye' }

			expect(diffRecord(prev, next)).toEqual({
				text: [ValueOpType.Put, 'Goodbye'],
			})
		})

		it('[D5] uses put when the string is shortened', () => {
			const prev = { text: 'Hello world' }
			const next = { text: 'Hello' }

			expect(diffRecord(prev, next)).toEqual({
				text: [ValueOpType.Put, 'Hello'],
			})
		})

		it('[D5] produces no diff for identical strings', () => {
			const prev = { text: 'Hello' }
			const next = { text: 'Hello' }

			expect(diffRecord(prev, next)).toBeNull()
		})

		it('[D5] handles large text appends', () => {
			const prev = { text: 'Start' }
			const longText = ' '.repeat(1000) + 'end'
			const next = { text: 'Start' + longText }

			expect(diffRecord(prev, next)).toEqual({
				text: [ValueOpType.Append, longText, 5],
			})
		})

		it('[D5] appends strings nested inside props', () => {
			const prev = { id: 'test:1', props: { label: 'Hello' } }
			const next = { id: 'test:1', props: { label: 'Hello world' } }

			expect(diffRecord(prev, next)).toEqual({
				props: [ValueOpType.Patch, { label: [ValueOpType.Append, ' world', 5] }],
			})
		})

		it('[D5] combines string appends with other property changes', () => {
			const prev = { text: 'Hello', x: 100 }
			const next = { text: 'Hello world', x: 200 }

			expect(diffRecord(prev, next)).toEqual({
				text: [ValueOpType.Append, ' world', 5],
				x: [ValueOpType.Put, 200],
			})
		})

		it('[D5] legacyAppendMode turns string appends into puts', () => {
			const prev = { id: 'a', text: 'hello' }
			const next = { id: 'a', text: 'hello world' }

			expect(diffRecord(prev, next, true)).toEqual({
				text: [ValueOpType.Put, 'hello world'],
			})
		})

		it('[D5] legacyAppendMode turns nested string appends into puts', () => {
			const prev = { id: 'a', props: { label: 'hello' } }
			const next = { id: 'a', props: { label: 'hello world' } }

			expect(diffRecord(prev, next, true)).toEqual({
				props: [ValueOpType.Patch, { label: [ValueOpType.Put, 'hello world'] }],
			})
		})

		it('[D5] [D7] legacyAppendMode does not affect array appends', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 2, 3, 4, 5] }

			expect(diffRecord(prev, next, true)).toEqual({
				arr: [ValueOpType.Append, [4, 5], 3],
			})
		})
	})

	describe('same-length arrays (D6)', () => {
		it('[D6] produces no op when no items changed', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 2, 3] }

			expect(diffRecord(prev, next)).toBeNull()
		})

		it('[D6] patches when at most max(length/5, 1) items changed', () => {
			const prev = { arr: [1, 2, 3, 4, 5] }
			const next = { arr: [1, 9, 3, 4, 5] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Patch, { '1': [ValueOpType.Put, 9] }],
			})
		})

		it('[D6] puts the whole array when more than max(length/5, 1) items changed', () => {
			// length 5 => threshold is max(1, 1) = 1, so 2 changes exceed it
			const prev = { arr: [1, 2, 3, 4, 5] }
			const next = { arr: [1, 9, 9, 4, 5] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [1, 9, 9, 4, 5]],
			})
		})

		it('[D6] patches exactly at the threshold for longer arrays', () => {
			// length 10 => threshold is max(10/5, 1) = 2, so 2 changes still patch
			const prev = { arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
			const next = { arr: [1, 20, 3, 4, 5, 6, 7, 80, 9, 10] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Patch, { '1': [ValueOpType.Put, 20], '7': [ValueOpType.Put, 80] }],
			})
		})

		it('[D6] puts the whole array just above the threshold for longer arrays', () => {
			// length 10 => threshold 2, so 3 changes bail out to a whole-array put
			const prev = { arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
			const next = { arr: [1, 20, 30, 40, 5, 6, 7, 8, 9, 10] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [1, 20, 30, 40, 5, 6, 7, 8, 9, 10]],
			})
		})

		it('[D6] puts the whole array when all items changed', () => {
			const prev = { arr: [1, 2, 3, 4, 5] }
			const next = { arr: [6, 7, 8, 9, 10] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [6, 7, 8, 9, 10]],
			})
		})

		it('[D6] recursively diffs changed indexes when both items are truthy objects', () => {
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

			expect(diffRecord(a, b)).toEqual({
				arr: [ValueOpType.Patch, { '1': [ValueOpType.Patch, { c: [ValueOpType.Put, 7] }] }],
			})
		})

		it('[D6] puts the whole array when too many object items changed', () => {
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

			expect(diffRecord(a, b)).toEqual({
				arr: [
					ValueOpType.Put,
					[
						{ a: 1, b: 2, c: 5 },
						{ a: 4, b: 5, c: 7 },
					],
				],
			})
		})

		it('[D6] puts a changed index when the old item is falsy', () => {
			const prev = { arr: [null, { a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }] }
			const next = { arr: [{ z: 9 }, { a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Patch, { '0': [ValueOpType.Put, { z: 9 }] }],
			})
		})

		it('[D6] puts a changed index when the new item is falsy', () => {
			const prev = { arr: [{ z: 9 }, { a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }] }
			const next = { arr: [null, { a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Patch, { '0': [ValueOpType.Put, null] }],
			})
		})
	})

	describe('different-length arrays (D7)', () => {
		it('[D7] appends when the array grew with an unchanged prefix', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 2, 3, 4, 5] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Append, [4, 5], 3],
			})
		})

		it('[D7] appends from an empty array', () => {
			const prev = { arr: [] }
			const next = { arr: [1, 2, 3] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Append, [1, 2, 3], 0],
			})
		})

		it('[D7] puts the whole array on truncation', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 2] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [1, 2]],
			})
		})

		it('[D7] puts the whole array when truncated to empty', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, []],
			})
		})

		it('[D7] puts the whole array when the shared prefix changed while growing', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 9, 3, 4, 5] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [1, 9, 3, 4, 5]],
			})
		})

		it('[D7] puts the whole array when the prefix changed at the same growth point', () => {
			const prev = { arr: [1, 2, 3] }
			const next = { arr: [1, 3, 4] }

			expect(diffRecord(prev, next)).toEqual({
				arr: [ValueOpType.Put, [1, 3, 4]],
			})
		})

		it('[D6] [D7] nested arrays are patchable at the end', () => {
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

			expect(diffRecord(a, b)).toEqual({
				arr: [ValueOpType.Patch, { '1': [ValueOpType.Append, [7, 8], 3] }],
			})
		})

		it('[D6] [D7] nested arrays are patchable at the beginning', () => {
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

			expect(diffRecord(a, b)).toEqual({
				arr: [ValueOpType.Patch, { '0': [ValueOpType.Append, [4, 5, 6], 3] }],
			})
		})
	})

	describe('complex scenarios', () => {
		it('[D3] [D4] [D5] handles shape-like record updates', () => {
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
	})
})

describe('applying diffs (AD)', () => {
	describe('immutability (AD1)', () => {
		it('[AD1] never mutates its input and returns a new object when changes apply', () => {
			const obj = { a: 1, b: 2 }
			const diff: ObjectDiff = { a: [ValueOpType.Put, 5] }

			const result = applyObjectDiff(obj, diff)
			expect(result).not.toBe(obj)
			expect(result).toEqual({ a: 5, b: 2 })
			expect(obj).toEqual({ a: 1, b: 2 })
		})

		it('[AD1] returns the same reference when no op had an effect', () => {
			const obj = { a: 1, b: 2 }
			expect(applyObjectDiff(obj, {})).toBe(obj)
		})

		it('[AD1] [AD2] returns the same reference when a put matches the current value', () => {
			const obj = { a: 1, nested: { x: 1 } }
			const diff: ObjectDiff = {
				a: [ValueOpType.Put, 1],
				nested: [ValueOpType.Put, { x: 1 }],
			}

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})

		it('[AD1] unchanged nested values keep their identity in the copy', () => {
			const obj = { changed: { x: 1 }, untouched: { y: 2 } }
			const diff: ObjectDiff = {
				changed: [ValueOpType.Patch, { x: [ValueOpType.Put, 100] }],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result).not.toBe(obj)
			expect(result.untouched).toBe(obj.untouched)
			expect(result.changed).not.toBe(obj.changed)
			expect(result).toEqual({ changed: { x: 100 }, untouched: { y: 2 } })
		})

		it('[AD1] [AD7] unchanged array items keep their identity in the copy', () => {
			const obj = { arr: [{ a: 1 }, { b: 2 }, { c: 3 }] }
			const diff: ObjectDiff = {
				arr: [ValueOpType.Patch, { '1': [ValueOpType.Patch, { b: [ValueOpType.Put, 20] }] }],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result.arr[1]).toEqual({ b: 20 })
			expect(result.arr[0]).toBe(obj.arr[0])
			expect(result.arr[2]).toBe(obj.arr[2])
		})
	})

	describe('put ops (AD2)', () => {
		it('[AD2] applies puts that change values and adds new keys', () => {
			const obj = { a: 1, b: 2 }
			const diff: ObjectDiff = {
				a: [ValueOpType.Put, 10],
				c: [ValueOpType.Put, 30],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ a: 10, b: 2, c: 30 })
		})

		it('[AD2] skips puts whose value is deep-equal to the current value', () => {
			const obj = { a: { deep: [1, 2, 3] } }
			const diff: ObjectDiff = { a: [ValueOpType.Put, { deep: [1, 2, 3] }] }

			const result = applyObjectDiff(obj, diff)
			expect(result).toBe(obj)
			expect(result.a).toBe(obj.a)
		})
	})

	describe('append ops (AD3)', () => {
		it('[AD3] applies string appends with a matching offset', () => {
			const obj = { text: 'Hello' }
			const diff: ObjectDiff = {
				text: [ValueOpType.Append, ' world', 5],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ text: 'Hello world' })
			expect(result).not.toBe(obj)
		})

		it('[AD3] applies appends from an empty string', () => {
			const obj = { text: '' }
			const diff: ObjectDiff = {
				text: [ValueOpType.Append, 'Hello', 0],
			}

			expect(applyObjectDiff(obj, diff)).toEqual({ text: 'Hello' })
		})

		it('[AD3] [AD7] applies array appends with a matching offset', () => {
			const obj = { arr: [1, 2, 3] }
			const diff: ObjectDiff = {
				arr: [ValueOpType.Append, [4, 5], 3],
			}

			expect(applyObjectDiff(obj, diff)).toEqual({ arr: [1, 2, 3, 4, 5] })
		})

		it('[AD3] ignores append ops with a mismatched offset', () => {
			const obj = { text: 'Hello' }
			const diff: ObjectDiff = {
				text: [ValueOpType.Append, ' world', 10], // wrong offset
			}

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})

		it('[AD3] ignores array append ops with a mismatched offset', () => {
			const obj = { arr: [1, 2, 3] }
			const diff: ObjectDiff = {
				arr: [ValueOpType.Append, [4, 5], 5], // wrong offset
			}

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})

		it('[AD3] ignores append ops on a value of mismatched type', () => {
			const obj = { text: 123 }
			const diff: ObjectDiff = {
				text: [ValueOpType.Append, ' world', 3],
			}

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})

		it('[AD3] ignores a string append op targeting an array', () => {
			const obj = { value: [1, 2, 3] }
			const diff: ObjectDiff = {
				value: [ValueOpType.Append, 'abc', 3],
			}

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})

		it('[AD3] applies multiple append ops in one diff', () => {
			const obj = { a: 'Hello', b: 'Foo' }
			const diff: ObjectDiff = {
				a: [ValueOpType.Append, ' world', 5],
				b: [ValueOpType.Append, 'bar', 3],
			}

			expect(applyObjectDiff(obj, diff)).toEqual({ a: 'Hello world', b: 'Foobar' })
		})
	})

	describe('patch ops (AD4)', () => {
		it('[AD4] applies nested object patches', () => {
			const obj = { a: 1, nested: { x: 10, y: 20 } }
			const diff: ObjectDiff = {
				nested: [ValueOpType.Patch, { x: [ValueOpType.Put, 100] }],
			}

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ a: 1, nested: { x: 100, y: 20 } })
			expect(result.nested).not.toBe(obj.nested)
		})

		it('[AD4] applies deeply nested patches', () => {
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

		it('[AD4] ignores patches on missing keys', () => {
			const obj = { a: 1 }
			const diff: ObjectDiff = {
				missing: [ValueOpType.Patch, { x: [ValueOpType.Put, 1] }],
			}

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})

		it('[AD4] ignores patches on primitive values', () => {
			const obj = { a: 1, s: 'hello', n: null }
			const diff: ObjectDiff = {
				a: [ValueOpType.Patch, { x: [ValueOpType.Put, 1] }],
				s: [ValueOpType.Patch, { x: [ValueOpType.Put, 1] }],
				n: [ValueOpType.Patch, { x: [ValueOpType.Put, 1] }],
			}

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})
	})

	describe('delete ops (AD5)', () => {
		it('[AD5] removes a key when present', () => {
			const obj = { a: 1, b: 2, c: 3 }
			const diff: ObjectDiff = { b: [ValueOpType.Delete] }

			const result = applyObjectDiff(obj, diff)
			expect(result).toEqual({ a: 1, c: 3 })
			expect('b' in result).toBe(false)
		})

		it('[AD5] deleting an absent key has no effect', () => {
			const obj = { a: 1 }
			const diff: ObjectDiff = { b: [ValueOpType.Delete] }

			expect(applyObjectDiff(obj, diff)).toBe(obj)
		})
	})

	describe('patching non-objects (AD6)', () => {
		it('[AD6] patching null returns the input unchanged', () => {
			const diff: ObjectDiff = { a: [ValueOpType.Put, 1] }
			expect(applyObjectDiff(null as any, diff)).toBe(null)
		})

		it('[AD6] patching a primitive returns the input unchanged', () => {
			const diff: ObjectDiff = { a: [ValueOpType.Put, 1] }
			expect(applyObjectDiff('hello' as any, diff)).toBe('hello')
			expect(applyObjectDiff(42 as any, diff)).toBe(42)
		})
	})

	describe('arrays (AD7)', () => {
		it('[AD7] clones arrays as arrays and indexes ops by numeric string keys', () => {
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
			expect(Array.isArray(result.arr)).toBe(true)
			expect(result.arr).toEqual([{ a: 1 }, { b: 20 }, { c: 3 }])
			expect(result.arr).not.toBe(obj.arr)
		})

		it('[AD7] puts values into array indexes by numeric string key', () => {
			const obj = { arr: [1, 2, 3] }
			const diff: ObjectDiff = {
				arr: [ValueOpType.Patch, { '1': [ValueOpType.Put, 9] }],
			}

			const result = applyObjectDiff(obj, diff)
			expect(Array.isArray(result.arr)).toBe(true)
			expect(result.arr).toEqual([1, 9, 3])
		})
	})
})

describe('getNetworkDiff (ND1)', () => {
	it('[ND1] returns null for an empty records diff', () => {
		const diff = { added: {}, updated: {}, removed: {} }
		expect(getNetworkDiff(diff)).toBeNull()
	})

	it('[ND1] maps added records to put ops', () => {
		const record = { id: 'test:1', type: 'test', data: 'value' }
		const diff = {
			added: { 'test:1': record },
			updated: {},
			removed: {},
		}

		expect(getNetworkDiff(diff)).toEqual({
			'test:1': [RecordOpType.Put, record],
		})
	})

	it('[ND1] maps removed records to remove ops', () => {
		const diff = {
			added: {},
			updated: {},
			removed: { 'test:1': { id: 'test:1', type: 'test' } },
		}

		expect(getNetworkDiff(diff)).toEqual({
			'test:1': [RecordOpType.Remove],
		})
	})

	it('[ND1] maps updated records to patch ops computed with diffRecord', () => {
		const prev = { id: 'test:1', type: 'test', x: 100, y: 200 }
		const next = { id: 'test:1', type: 'test', x: 150, y: 200 }
		const diff = {
			added: {},
			updated: { 'test:1': [prev, next] },
			removed: {},
		}

		expect(getNetworkDiff(diff)).toEqual({
			'test:1': [RecordOpType.Patch, { x: [ValueOpType.Put, 150] }],
		})
	})

	it('[ND1] omits updated entries that compute to no diff, returning null when nothing remains', () => {
		const record = { id: 'test:1', type: 'test', x: 100 }
		const diff = {
			added: {},
			updated: { 'test:1': [record, record] },
			removed: {},
		}

		expect(getNetworkDiff(diff)).toBeNull()
	})

	it('[ND1] handles mixed operations', () => {
		const addedRecord = { id: 'test:1', type: 'test', data: 'new' }
		const prevRecord = { id: 'test:2', type: 'test', x: 100 }
		const nextRecord = { id: 'test:2', type: 'test', x: 200 }
		const removedRecord = { id: 'test:3', type: 'test' }

		const diff = {
			added: { 'test:1': addedRecord },
			updated: { 'test:2': [prevRecord, nextRecord] },
			removed: { 'test:3': removedRecord },
		}

		expect(getNetworkDiff(diff)).toEqual({
			'test:1': [RecordOpType.Put, addedRecord],
			'test:2': [RecordOpType.Patch, { x: [ValueOpType.Put, 200] }],
			'test:3': [RecordOpType.Remove],
		})
	})

	it('[ND1] [D5] produces append patches for string growth in updates', () => {
		const prev = { id: 'shape:1', type: 'text', text: 'Hello' }
		const next = { id: 'shape:1', type: 'text', text: 'Hello world' }

		const recordsDiff = {
			added: {},
			updated: { 'shape:1': [prev, next] },
			removed: {},
		}

		expect(getNetworkDiff(recordsDiff)).toEqual({
			'shape:1': [RecordOpType.Patch, { text: [ValueOpType.Append, ' world', 5] }],
		})
	})
})
