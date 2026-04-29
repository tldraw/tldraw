import type { AST } from '@rocicorp/zero'

/**
 * Validate that an AST doesn't use unsupported features.
 * Throws descriptive errors for features not implemented in the polyfill.
 */
export function validateAST(ast: AST): void {
	if (ast.orderBy?.length) {
		throw new Error(`Unsupported AST feature: orderBy is not implemented in polyfill`)
	}
	if (ast.start) {
		throw new Error(
			`Unsupported AST feature: start (pagination bounds) is not implemented in polyfill`
		)
	}
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
