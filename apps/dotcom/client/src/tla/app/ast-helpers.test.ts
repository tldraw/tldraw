import type { AST } from '@rocicorp/zero'
import { evaluateCondition, validateAST } from './ast-helpers'

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

	it('should throw for AST with orderBy', () => {
		const ast: AST = {
			table: 'user',
			orderBy: [['name', 'asc']],
		}
		expect(() => validateAST(ast)).toThrow(
			'Unsupported AST feature: orderBy is not implemented in polyfill'
		)
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

	describe('unsupported features', () => {
		it('should throw for correlatedSubquery (EXISTS)', () => {
			const condition = {
				type: 'correlatedSubquery' as const,
				related: {
					correlation: { parentField: ['id'], childField: ['userId'] },
					subquery: { table: 'file' },
				},
				op: 'EXISTS' as const,
			}
			expect(() => evaluateCondition(condition as any, row)).toThrow(
				'Unsupported condition type: correlatedSubquery (EXISTS/NOT EXISTS) is not implemented in polyfill'
			)
		})

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
