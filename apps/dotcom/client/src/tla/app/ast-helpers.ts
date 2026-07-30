import type { AST } from '@rocicorp/zero'

/**
 * Validate that an AST doesn't use unsupported features.
 * Throws descriptive errors for features not implemented in the polyfill.
 */
export function validateAST(ast: AST): void {
	if (ast.start) {
		throw new Error(
			`Unsupported AST feature: start (pagination bounds) is not implemented in polyfill`
		)
	}
}

/**
 * Sort rows by an AST `orderBy` (a list of `[field, 'asc' | 'desc']` parts, applied in order).
 * Stable and top-level only — matching how the polyfill executes flat table queries.
 */
export function applyOrderBy<T>(rows: T[], orderBy: AST['orderBy']): T[] {
	if (!orderBy?.length) return rows
	return [...rows].sort((a, b) => {
		for (const [field, direction] of orderBy) {
			const av = (a as Record<string, unknown>)[field] as string | number | undefined
			const bv = (b as Record<string, unknown>)[field] as string | number | undefined
			if (av === bv) continue
			// undefined sorts last regardless of direction
			if (av === undefined) return 1
			if (bv === undefined) return -1
			const cmp = av < bv ? -1 : 1
			return direction === 'desc' ? -cmp : cmp
		}
		return 0
	})
}

/** Table name -> rows, i.e. the polyfill store's full data, needed to evaluate EXISTS subqueries. */
export type PolyfillData = Record<string, Record<string, unknown>[]>

interface Correlation {
	readonly parentField: readonly string[]
	readonly childField: readonly string[]
}
interface CorrelatedSubqueryCondition {
	readonly type: 'correlatedSubquery'
	readonly op: 'EXISTS' | 'NOT EXISTS'
	readonly related: { readonly correlation: Correlation; readonly subquery: AST }
}

/**
 * Evaluate a `whereExists`/`whereNotExists` subquery against a parent row: does the correlated
 * child table have a row that matches on the correlation key(s) and satisfies the subquery's own
 * `where` (which may itself contain EXISTS, so this recurses)?
 */
function evaluateCorrelatedSubquery(
	condition: CorrelatedSubqueryCondition,
	parentRow: Record<string, unknown>,
	data?: PolyfillData
): boolean {
	const { related, op } = condition
	const { correlation, subquery } = related
	// Without store data we can't evaluate EXISTS. The only use is access-scoping (a query for rows
	// on files the user can see), and the polyfill store is already server-scoped to the user, so
	// treat EXISTS as satisfied rather than spuriously hiding rows.
	if (!data) return op === 'EXISTS'
	const childRows = data[subquery.table] ?? []
	const anyMatch = childRows.some((childRow) => {
		// Equality correlation on (possibly compound) keys: parent[parentField[i]] === child[childField[i]]
		for (let i = 0; i < correlation.parentField.length; i++) {
			if (parentRow[correlation.parentField[i]] !== childRow[correlation.childField[i]])
				return false
		}
		return subquery.where ? evaluateCondition(subquery.where, childRow, data) : true
	})
	return op === 'EXISTS' ? anyMatch : !anyMatch
}

/**
 * Evaluate a where condition against a row.
 * Supported: and, or, simple conditions with =, !=, >, <, >=, <= operators, and
 * correlatedSubquery (EXISTS/NOT EXISTS) when `data` is provided.
 * NOT supported: LIKE, IN, IS operators.
 */
export function evaluateCondition(
	condition: NonNullable<AST['where']>,
	row: Record<string, unknown>,
	data?: PolyfillData
): boolean {
	if ('type' in condition) {
		switch (condition.type) {
			case 'and':
				return (condition as { conditions: readonly NonNullable<AST['where']>[] }).conditions.every(
					(c) => evaluateCondition(c, row, data)
				)
			case 'or':
				return (condition as { conditions: readonly NonNullable<AST['where']>[] }).conditions.some(
					(c) => evaluateCondition(c, row, data)
				)
			case 'simple':
				// Fall through to simple condition handling below
				break
			case 'correlatedSubquery':
				return evaluateCorrelatedSubquery(
					condition as unknown as CorrelatedSubqueryCondition,
					row,
					data
				)
			default:
				throw new Error(`Unknown condition type: ${(condition as { type: string }).type}`)
		}
	}

	// Simple condition: { left, op, right } or { type: 'simple', left, op, right }
	const simpleCondition = condition as {
		left: { type?: string; name: string }
		op: string
		right: { type?: string; value: unknown }
	}

	// Validate left side is a column reference
	if (simpleCondition.left?.type === 'static') {
		throw new Error(`Unsupported: static parameter references are not implemented in polyfill`)
	}

	const fieldName = simpleCondition.left?.name
	const op = simpleCondition.op
	const value = simpleCondition.right?.value

	if (!fieldName || !op) {
		throw new Error(`Malformed condition: missing fieldName or op`)
	}

	const rowValue = row[fieldName]

	switch (op) {
		case '=':
			return rowValue === value
		case '!=':
			return rowValue !== value
		case '>':
			return (rowValue as number) > (value as number)
		case '<':
			return (rowValue as number) < (value as number)
		case '>=':
			return (rowValue as number) >= (value as number)
		case '<=':
			return (rowValue as number) <= (value as number)
		case 'IS':
			return rowValue === value
		case 'IS NOT':
			return rowValue !== value
		default: {
			const _exhaustive: never = op as never
			throw new Error(`Unsupported operator: ${_exhaustive}`)
		}
	}
}
