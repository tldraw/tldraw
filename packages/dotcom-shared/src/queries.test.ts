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

function astOf(name: keyof typeof queries, args: object = {}) {
	const query = (queries as any)[name].fn({ ctx, args })
	return JSON.parse(JSON.stringify(query.ast ?? query))
}

describe('feed query shape', () => {
	// Not a style preference: this is the regression guard for the outage described on
	// accessGateDepth. A query that reaches `file` more than one hop from its root is the shape
	// that took production down, however small the table it is rooted at.
	it.each([
		['comments', {}],
		['reactions', {}],
		['fileComments', { fileId: 'file:1' }],
	])('keeps the file access gate one hop from the root: %s', (name, args) => {
		const ast = astOf(name as keyof typeof queries, args)
		expect(accessGateDepth(ast, 'file')).toBe(1)
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
