import type { AST } from '@rocicorp/zero'
import { applyOrderBy, evaluateCondition, validateAST } from './ast-helpers'

describe('validateAST', () => {
	it('should pass for basic AST without unsupported features', () => {
		const ast: AST = { table: 'user' }
		expect(() => validateAST(ast)).not.toThrow()
	})

	it('should pass for AST with where and limit', () => {
		const ast: AST = {
			table: 'user',
			where: {
				type: 'simple',
				left: { type: 'column', name: 'id' },
				op: '=',
				right: { type: 'literal', value: '123' },
			},
			limit: 1,
		}
		expect(() => validateAST(ast)).not.toThrow()
	})

	it('should pass for AST with orderBy (supported)', () => {
		const ast: AST = {
			table: 'user',
			orderBy: [['name', 'asc']],
		}
		expect(() => validateAST(ast)).not.toThrow()
	})

	it('should throw for AST with start (pagination bounds)', () => {
		const ast: AST = {
			table: 'user',
			start: { row: { id: '123' }, exclusive: false },
		}
		expect(() => validateAST(ast)).toThrow(
			'Unsupported AST feature: start (pagination bounds) is not implemented in polyfill'
		)
	})
})

describe('applyOrderBy', () => {
	const rows = [
		{ id: 'a', createdAt: 3 },
		{ id: 'b', createdAt: 1 },
		{ id: 'c', createdAt: 2 },
	]

	it('returns rows unchanged when there is no orderBy', () => {
		expect(applyOrderBy(rows, undefined)).toEqual(rows)
		expect(applyOrderBy(rows, [])).toEqual(rows)
	})

	it('sorts ascending and descending by a field', () => {
		expect(applyOrderBy(rows, [['createdAt', 'asc']]).map((r) => r.id)).toEqual(['b', 'c', 'a'])
		expect(applyOrderBy(rows, [['createdAt', 'desc']]).map((r) => r.id)).toEqual(['a', 'c', 'b'])
	})

	it('applies order parts in sequence for ties', () => {
		const tied = [
			{ id: 'a', group: 1, createdAt: 2 },
			{ id: 'b', group: 1, createdAt: 1 },
			{ id: 'c', group: 0, createdAt: 5 },
		]
		expect(
			applyOrderBy(tied, [
				['group', 'asc'],
				['createdAt', 'desc'],
			]).map((r) => r.id)
		).toEqual(['c', 'a', 'b'])
	})

	it('sorts undefined values last regardless of direction', () => {
		const withGaps = [{ id: 'a', createdAt: 2 }, { id: 'b' }, { id: 'c', createdAt: 1 }]
		expect(applyOrderBy(withGaps, [['createdAt', 'asc']]).map((r) => r.id)).toEqual(['c', 'a', 'b'])
		expect(applyOrderBy(withGaps, [['createdAt', 'desc']]).map((r) => r.id)).toEqual([
			'a',
			'c',
			'b',
		])
	})

	it('does not mutate the input array', () => {
		const input = [...rows]
		applyOrderBy(input, [['createdAt', 'asc']])
		expect(input).toEqual(rows)
	})
})

describe('evaluateCondition', () => {
	const row = { id: '123', name: 'Alice', age: 30, active: true }

	describe('simple conditions', () => {
		it('should evaluate = operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: '=' as const,
				right: { type: 'literal' as const, value: 'Alice' },
			}
			expect(evaluateCondition(condition, row)).toBe(true)
			expect(
				evaluateCondition({ ...condition, right: { type: 'literal' as const, value: 'Bob' } }, row)
			).toBe(false)
		})

		it('should evaluate != operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: '!=' as const,
				right: { type: 'literal' as const, value: 'Bob' },
			}
			expect(evaluateCondition(condition, row)).toBe(true)
		})

		it('should evaluate > operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'age' },
				op: '>' as const,
				right: { type: 'literal' as const, value: 25 },
			}
			expect(evaluateCondition(condition, row)).toBe(true)
			expect(
				evaluateCondition({ ...condition, right: { type: 'literal' as const, value: 35 } }, row)
			).toBe(false)
		})

		it('should evaluate < operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'age' },
				op: '<' as const,
				right: { type: 'literal' as const, value: 35 },
			}
			expect(evaluateCondition(condition, row)).toBe(true)
		})

		it('should evaluate >= operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'age' },
				op: '>=' as const,
				right: { type: 'literal' as const, value: 30 },
			}
			expect(evaluateCondition(condition, row)).toBe(true)
			expect(
				evaluateCondition({ ...condition, right: { type: 'literal' as const, value: 31 } }, row)
			).toBe(false)
		})

		it('should evaluate <= operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'age' },
				op: '<=' as const,
				right: { type: 'literal' as const, value: 30 },
			}
			expect(evaluateCondition(condition, row)).toBe(true)
		})

		it('should work without explicit type: simple', () => {
			// Zero sometimes omits the type field for simple conditions
			const condition = {
				left: { name: 'name' },
				op: '=',
				right: { value: 'Alice' },
			}
			expect(evaluateCondition(condition as any, row)).toBe(true)
		})
	})

	describe('compound conditions', () => {
		it('should evaluate AND conditions', () => {
			const condition = {
				type: 'and' as const,
				conditions: [
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'name' },
						op: '=' as const,
						right: { type: 'literal' as const, value: 'Alice' },
					},
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'age' },
						op: '>' as const,
						right: { type: 'literal' as const, value: 25 },
					},
				],
			}
			expect(evaluateCondition(condition, row)).toBe(true)
		})

		it('should return false if any AND condition fails', () => {
			const condition = {
				type: 'and' as const,
				conditions: [
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'name' },
						op: '=' as const,
						right: { type: 'literal' as const, value: 'Alice' },
					},
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'age' },
						op: '>' as const,
						right: { type: 'literal' as const, value: 35 },
					},
				],
			}
			expect(evaluateCondition(condition, row)).toBe(false)
		})

		it('should evaluate OR conditions', () => {
			const condition = {
				type: 'or' as const,
				conditions: [
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'name' },
						op: '=' as const,
						right: { type: 'literal' as const, value: 'Bob' },
					},
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'age' },
						op: '>' as const,
						right: { type: 'literal' as const, value: 25 },
					},
				],
			}
			expect(evaluateCondition(condition, row)).toBe(true)
		})

		it('should return false if all OR conditions fail', () => {
			const condition = {
				type: 'or' as const,
				conditions: [
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'name' },
						op: '=' as const,
						right: { type: 'literal' as const, value: 'Bob' },
					},
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'age' },
						op: '>' as const,
						right: { type: 'literal' as const, value: 35 },
					},
				],
			}
			expect(evaluateCondition(condition, row)).toBe(false)
		})

		it('should handle nested AND/OR conditions', () => {
			const condition = {
				type: 'and' as const,
				conditions: [
					{
						type: 'or' as const,
						conditions: [
							{
								type: 'simple' as const,
								left: { type: 'column' as const, name: 'name' },
								op: '=' as const,
								right: { type: 'literal' as const, value: 'Alice' },
							},
							{
								type: 'simple' as const,
								left: { type: 'column' as const, name: 'name' },
								op: '=' as const,
								right: { type: 'literal' as const, value: 'Bob' },
							},
						],
					},
					{
						type: 'simple' as const,
						left: { type: 'column' as const, name: 'active' },
						op: '=' as const,
						right: { type: 'literal' as const, value: true },
					},
				],
			}
			expect(evaluateCondition(condition, row)).toBe(true)
		})
	})

	describe('correlatedSubquery (EXISTS)', () => {
		// comment(fileId) -> file(id), scoped to files the user has a state for
		const existsCondition = {
			type: 'correlatedSubquery' as const,
			op: 'EXISTS' as const,
			related: {
				correlation: { parentField: ['fileId'], childField: ['id'] },
				subquery: {
					table: 'file',
					where: {
						type: 'correlatedSubquery' as const,
						op: 'EXISTS' as const,
						related: {
							correlation: { parentField: ['id'], childField: ['fileId'] },
							subquery: {
								table: 'file_state',
								where: {
									type: 'simple' as const,
									left: { type: 'column' as const, name: 'userId' },
									op: '=' as const,
									right: { type: 'literal' as const, value: 'u1' },
								},
							},
						},
					},
				},
			},
		}

		it('is true when a correlated child row exists and its nested EXISTS matches', () => {
			const data = {
				file: [{ id: 'f1' }],
				file_state: [{ fileId: 'f1', userId: 'u1' }],
			}
			expect(evaluateCondition(existsCondition as any, { fileId: 'f1' }, data)).toBe(true)
		})

		it('is false when the nested access subquery does not match', () => {
			const data = {
				file: [{ id: 'f1' }],
				file_state: [{ fileId: 'f1', userId: 'someone-else' }],
			}
			expect(evaluateCondition(existsCondition as any, { fileId: 'f1' }, data)).toBe(false)
		})

		it('is false when no correlated child row exists', () => {
			const data = { file: [{ id: 'other' }], file_state: [] }
			expect(evaluateCondition(existsCondition as any, { fileId: 'f1' }, data)).toBe(false)
		})

		it('treats EXISTS as satisfied when no store data is provided', () => {
			expect(evaluateCondition(existsCondition as any, { fileId: 'f1' })).toBe(true)
		})

		it('inverts for NOT EXISTS', () => {
			const notExists = { ...existsCondition, op: 'NOT EXISTS' as const }
			const data = { file: [{ id: 'f1' }], file_state: [{ fileId: 'f1', userId: 'u1' }] }
			expect(evaluateCondition(notExists as any, { fileId: 'f1' }, data)).toBe(false)
		})
	})

	describe('unsupported features', () => {
		it('should evaluate IS operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: 'IS' as const,
				right: { type: 'literal' as const, value: null },
			}
			expect(evaluateCondition(condition as any, row)).toBe(false)
			expect(evaluateCondition(condition as any, { ...row, name: null })).toBe(true)
		})

		it('should evaluate IS NOT operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: 'IS NOT' as const,
				right: { type: 'literal' as const, value: null },
			}
			expect(evaluateCondition(condition as any, row)).toBe(true)
			expect(evaluateCondition(condition as any, { ...row, name: null })).toBe(false)
		})

		it('should throw for LIKE operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: 'LIKE' as const,
				right: { type: 'literal' as const, value: '%Alice%' },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow('Unsupported operator: LIKE')
		})

		it('should throw for ILIKE operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: 'ILIKE' as const,
				right: { type: 'literal' as const, value: '%alice%' },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow('Unsupported operator: ILIKE')
		})

		it('should throw for IN operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: 'IN' as const,
				right: { type: 'literal' as const, value: ['Alice', 'Bob'] },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow('Unsupported operator: IN')
		})

		it('should throw for NOT IN operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: 'NOT IN' as const,
				right: { type: 'literal' as const, value: ['Bob', 'Charlie'] },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow('Unsupported operator: NOT IN')
		})

		it('should throw for static parameter references', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'static' as const, anchor: 'authData', field: 'userId' },
				op: '=' as const,
				right: { type: 'literal' as const, value: '123' },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow(
				'Unsupported: static parameter references are not implemented in polyfill'
			)
		})

		it('should throw for unknown condition type', () => {
			const condition = {
				type: 'unknownType' as const,
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow(
				'Unknown condition type: unknownType'
			)
		})

		it('should throw for unknown operator', () => {
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'name' },
				op: 'UNKNOWN' as const,
				right: { type: 'literal' as const, value: 'test' },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow(
				'Unsupported operator: UNKNOWN'
			)
		})
	})

	describe('edge cases', () => {
		it('should throw for malformed condition without fieldName', () => {
			const condition = {
				left: {},
				op: '=',
				right: { value: 'test' },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow(
				'Malformed condition: missing fieldName or op'
			)
		})

		it('should throw for malformed condition without op', () => {
			const condition = {
				left: { name: 'id' },
				right: { value: 'test' },
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow(
				'Malformed condition: missing fieldName or op'
			)
		})

		it('should handle undefined row values', () => {
			// Test that comparing a non-existent field works (row value is undefined)
			const condition = {
				left: { name: 'nonexistent' },
				op: '=',
				right: { value: undefined },
			}
			expect(evaluateCondition(condition as any, row)).toBe(true)
		})

		it('should handle null comparisons', () => {
			const rowWithNull = { ...row, nullable: null }
			const condition = {
				type: 'simple' as const,
				left: { type: 'column' as const, name: 'nullable' },
				op: '=' as const,
				right: { type: 'literal' as const, value: null },
			}
			expect(evaluateCondition(condition, rowWithNull)).toBe(true)
		})
	})
})
