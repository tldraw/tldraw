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

/**
 * Evaluate a where condition against a row.
 * Supported: and, or, simple conditions with =, !=, >, <, >=, <= operators
 * NOT supported: correlatedSubquery (EXISTS), LIKE, IN, IS operators
 */
export function evaluateCondition(
	condition: NonNullable<AST['where']>,
	row: Record<string, unknown>
): boolean {
	if ('type' in condition) {
		switch (condition.type) {
			case 'and':
				return (condition as { conditions: readonly NonNullable<AST['where']>[] }).conditions.every(
					(c) => evaluateCondition(c, row)
				)
			case 'or':
				return (condition as { conditions: readonly NonNullable<AST['where']>[] }).conditions.some(
					(c) => evaluateCondition(c, row)
				)
			case 'simple':
				// Fall through to simple condition handling below
				break
			case 'correlatedSubquery':
				throw new Error(
					`Unsupported condition type: correlatedSubquery (EXISTS/NOT EXISTS) is not implemented in polyfill`
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
