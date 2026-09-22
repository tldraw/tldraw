import { createBuilder } from '@rocicorp/zero'
import { describe, expect, it } from 'vitest'
import { queries, ZeroContext } from './queries'
import { schema } from './tlaSchema'

const zql = createBuilder(schema)
const ctx: ZeroContext = { userId: 'user_test' }

/**
 * How many correlated-subquery hops it takes to reach `table` from the query root — the property
 * that decides what one of these queries costs.
 *
 * The file-access gate (`file` and its `states`/`groupFiles` relations) is the expensive part of
 * every feed query: `file`, `file_state` and `group_file` each hold hundreds of thousands of rows.
 * At depth 1 the fileId correlation is pushed into those relations and the gate touches only the
 * handful of files the query concerns. Deeper, it isn't, and the query traverses them wholesale —
 * `reactions` rooted at `comment_reaction` put the gate at depth 2 and took ~150s to materialize
 * in production (while `comment_reaction` held ~50 rows), outrunning the sync connection's 60s
 * auth token so that no client could complete a first sync. Neither unit tests nor the PR preview
 * deploy can catch that: previews run against a fresh database with no file_state volume.
 *
 * Scans only the root `where` tree; gates inside `related` branches aren't measured.
 */
export function accessGateDepth(ast: any, table: string): number {
	// the deepest occurrence, not the shallowest: one cheap path to `file` doesn't redeem a second
	// path that reaches it two hops down
	let deepest = 0
	const visit = (condition: any, depth: number) => {
		if (!condition || typeof condition !== 'object') return
		if (condition.type === 'correlatedSubquery' && condition.related?.subquery) {
			const subquery = condition.related.subquery
			if (subquery.table === table) deepest = Math.max(deepest, depth + 1)
			visit(subquery.where, depth + 1)
		}
		for (const nested of condition.conditions ?? []) visit(nested, depth)
	}
	visit(ast.where, 0)
	return deepest
}

/**
 * Zero's planner refuses to plan a query with more EXISTS checks than this (MAX_FLIPPABLE_JOINS in
 * zql/src/planner/planner-graph.ts, 2^n candidate plans) and runs it exactly as written. Counted
 * over the whole root `where` tree, nested subqueries included.
 */
const MAX_PLANNABLE_EXISTS = 9

export function countExists(ast: any): number {
	let n = 0
	const visit = (condition: any) => {
		if (!condition || typeof condition !== 'object') return
		if (condition.type === 'correlatedSubquery' && condition.related?.subquery) {
			n++
			visit(condition.related.subquery.where)
		}
		for (const nested of condition.conditions ?? []) visit(nested)
	}
	visit(ast.where)
	return n
}

function astOf(name: keyof typeof queries, args: object = {}) {
	const query = (queries as any)[name].fn({ ctx, args })
	return JSON.parse(JSON.stringify(query.ast ?? query))
}

describe('feed query shape', () => {
	// Not a style preference: this is the regression guard for the outage described on
	// accessGateDepth. A query that reaches `file` more than one hop from its root is the shape
	// that took production down, however small the table it is rooted at.
	it.each([
		['comments', {}, 1],
		// reactions no longer consults `file` at all: the gate reads file_state / group_file directly
		['reactions', {}, 0],
		['fileComments', { fileId: 'file:1' }, 1],
	])('keeps the file access gate one hop from the root: %s', (name, args, depth) => {
		const ast = astOf(name as keyof typeof queries, args)
		expect(accessGateDepth(ast, 'file')).toBe(depth)
	})

	// The gate has to sit on relations correlated straight on the comment's fileId (file_state,
	// group_file) — not behind `file` — and as one top-level conjunct rather than repeated inside
	// each notification category. That is the shape Zero's planner can flip: start from the
	// caller's own file_state / group_user rows and join comments in, so reads scale with the
	// caller's data instead of every comment in the database (tldraw-internal#2032).
	it.each([['comments'], ['reactions']])(
		'gates access directly on the comment fileId, once, at the root: %s',
		(name) => {
			const ast = astOf(name as keyof typeof queries)
			expect(accessGateDepth(ast, 'file_state')).toBe(1)
			expect(accessGateDepth(ast, 'group_file')).toBe(1)
			expect(ast.where.type).toBe('and')
			const gates = ast.where.conditions.filter(
				(c: any) =>
					c.type === 'or' &&
					c.conditions.every(
						(b: any) =>
							b.type === 'correlatedSubquery' &&
							['file_state', 'group_file'].includes(b.related.subquery.table)
					)
			)
			expect(gates).toHaveLength(1)
			// the categories don't re-check access: `file` is only consulted for its own columns
			const fileGates = ast.where.conditions.flatMap((c: any) =>
				c.type === 'or' ? c.conditions : [c]
			)
			for (const c of fileGates) {
				if (c.type === 'correlatedSubquery' && c.related.subquery.table === 'file') {
					expect(accessGateDepth(c.related.subquery, 'file_state')).toBe(0)
					expect(accessGateDepth(c.related.subquery, 'group_file')).toBe(0)
				}
			}
		}
	)

	// Over the limit the planner doesn't run at all and the query runs verbatim, comment-first,
	// so the cheap gate above is worthless (tldraw-internal#2032)
	it.each([
		['comments', {}],
		['reactions', {}],
		['fileComments', { fileId: 'file:1' }],
	])('stays within the planner EXISTS limit: %s', (name, args) => {
		expect(countExists(astOf(name as keyof typeof queries, args))).toBeLessThanOrEqual(
			MAX_PLANNABLE_EXISTS
		)
	})

	it('roots the reactions feed at comment, not comment_reaction', () => {
		expect(astOf('reactions').table).toBe('comment')
	})

	// proves the guard above can actually fail: reaching `file` through an intermediate subquery,
	// the way the pre-fix `reactions` query reached it through `comment`, measures one hop deeper
	it('measures a gate behind an intermediate subquery as depth 2', () => {
		const gateBehindThread = zql.comment
			.where('authorId', '=', ctx.userId)
			.whereExists('thread', (t) => t.whereExists('file', (f) => f.where('isDeleted', '=', false)))
		const ast = JSON.parse(JSON.stringify((gateBehindThread as any).ast ?? gateBehindThread))
		expect(accessGateDepth(ast, 'file')).toBe(2)
	})
})
