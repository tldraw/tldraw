import { createBuilder, mustGetQuery } from '@rocicorp/zero'
import { Database, QueryDelegate } from '@rocicorp/zero/zqlite'
import { describe, expect, it } from 'vitest'
import { queries, ZeroContext } from './queries'
import { schema } from './tlaSchema'

const zql = createBuilder(schema)
const ctx: ZeroContext = { userId: 'user_test' }

/**
 * How many correlated-subquery hops it takes to reach `table` from the query root — the property
 * that decides what one of these queries costs.
 *
 * The file-access gate (`file_state` / `group_file`, correlated on the comment's fileId) is the
 * expensive part of every feed query: those tables, like `file`, each hold hundreds of thousands
 * of rows. At depth 1 the fileId correlation is pushed into the gate and it touches only the
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
 * zql/src/planner/planner-graph.ts) and runs it exactly as written. Counted over the whole root
 * `where` tree, nested subqueries included.
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

/** Every `or` in the where tree, nested subqueries included. */
function countOrs(ast: any): number {
	let n = 0
	const visit = (condition: any) => {
		if (!condition || typeof condition !== 'object') return
		if (condition.type === 'or') n++
		if (condition.type === 'correlatedSubquery') visit(condition.related?.subquery?.where)
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
		['homeBoardComments', {}, 1],
		// these gate on file_state / group_file directly and never consult `file` in their where
		['threadStarterComments', {}, 0],
		['threadParticipantComments', {}, 0],
		['mentionComments', {}, 0],
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
	//
	// It must also be the only OR at the root: see why on `homeBoardComments`.
	it.each([
		['homeBoardComments'],
		['threadStarterComments'],
		['threadParticipantComments'],
		['mentionComments'],
		['reactions'],
	])(
		'gates access directly on the comment fileId, once, at the root, with no other OR: %s',
		(name) => {
			const ast = astOf(name as keyof typeof queries)
			expect(accessGateDepth(ast, 'file_state')).toBe(1)
			expect(accessGateDepth(ast, 'group_file')).toBe(1)
			expect(ast.where.type).toBe('and')
			const ors = ast.where.conditions.filter((c: any) => c.type === 'or')
			expect(ors).toHaveLength(1)
			// nor one nested in a subquery: an OR of reasons inside `thread` has no single seek
			expect(countOrs(ast)).toBe(1)
			expect(ors[0].conditions.map((b: any) => [b.type, b.related?.subquery.table])).toEqual([
				['correlatedSubquery', 'file_state'],
				['correlatedSubquery', 'group_file'],
			])
			// the reasons don't re-check access: `file` is only consulted for its own columns
			for (const c of ast.where.conditions) {
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
		['homeBoardComments', {}],
		['threadStarterComments', {}],
		['threadParticipantComments', {}],
		['mentionComments', {}],
		['reactions', {}],
		['fileComments', { fileId: 'file:1' }],
	])('stays within the planner EXISTS limit: %s', (name, args) => {
		expect(countExists(astOf(name as keyof typeof queries, args))).toBeLessThanOrEqual(
			MAX_PLANNABLE_EXISTS
		)
	})

	// a tab still running the previous bundle asks the query endpoint for this name; an unknown
	// name is a per-query error that leaves its feed empty with nothing prompting a reload
	it('keeps the previous feed name resolvable for tabs open across the deploy', () => {
		expect(() => mustGetQuery(queries, 'comments')).not.toThrow()
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

// The shape tests above pin where the gate sits, not what it says: a gate on `userId != me`, one
// missing the groupMembers hop, or a feed that lost `authorId != me` all keep the same shape. The
// client re-derives each reason from the rows it gets, so e2e can't see an over-fetch either.
// These run the real queries over a seeded in-memory replica instead.
describe('feed query results', () => {
	const me = ctx.userId
	const other = 'user_other'
	const third = 'user_third'
	const W = 'group_w' // a workspace I'm in
	const X = 'group_x' // a workspace I'm not in

	type Rows = Record<string, Record<string, unknown>[]>
	const file = (id: string, owningGroupId: string, isDeleted = false) => ({
		id,
		owningGroupId,
		isDeleted,
	})
	const thread = (id: string, fileId: string, createdBy: string, isDeleted = false) => ({
		id,
		fileId,
		createdBy,
		isDeleted,
	})
	let clock = 0
	const comment = (
		id: string,
		threadId: string,
		fileId: string,
		authorId: string,
		isDeleted = false
	) => ({ id, threadId, fileId, authorId, isDeleted, createdAt: ++clock })

	const rows: Rows = {
		group_user: [
			{ userId: me, groupId: me },
			{ userId: me, groupId: W },
			{ userId: third, groupId: X },
		],
		file: [
			file('f_home', me),
			file('f_w', W),
			// opened via a share link
			file('f_shared', other),
			// X's board; only third has access rows for it
			file('f_x', X),
			// trashed: migration 023 deleted its access rows
			file('f_trashed', me, true),
		],
		group_file: [
			{ fileId: 'f_home', groupId: me },
			{ fileId: 'f_w', groupId: W },
			{ fileId: 'f_x', groupId: X },
		],
		file_state: [
			{ userId: me, fileId: 'f_shared' },
			{ userId: third, fileId: 'f_x' },
		],
		comment_thread: [
			thread('t_home', 'f_home', other),
			// I started it, then deleted my root comment: only the starter feed still matches
			thread('t_started', 'f_w', me),
			thread('t_joined', 'f_w', other),
			thread('t_untouched', 'f_w', other),
			thread('t_mention', 'f_shared', other),
			thread('t_x_started', 'f_x', me),
			thread('t_x_mention', 'f_x', other),
			thread('t_own', 'f_home', me),
			thread('t_deleted', 'f_home', other, true),
			thread('t_trashed', 'f_trashed', other),
		],
		comment: [
			comment('c_home', 't_home', 'f_home', other),
			comment('c_my_root', 't_started', 'f_w', me, true),
			comment('c_started_reply', 't_started', 'f_w', other),
			comment('c_joined_root', 't_joined', 'f_w', other),
			comment('c_my_reply', 't_joined', 'f_w', me),
			comment('c_joined_reply', 't_joined', 'f_w', other),
			comment('c_untouched', 't_untouched', 'f_w', other),
			comment('c_mention', 't_mention', 'f_shared', other),
			comment('c_mention_third', 't_mention', 'f_shared', other),
			comment('c_x_reply', 't_x_started', 'f_x', other),
			comment('c_x_mention', 't_x_mention', 'f_x', other),
			comment('c_own', 't_own', 'f_home', me),
			comment('c_deleted', 't_home', 'f_home', other, true),
			comment('c_deleted_thread', 't_deleted', 'f_home', other),
			comment('c_trashed', 't_trashed', 'f_trashed', other),
		],
		comment_mention: [
			{ commentId: 'c_mention', userId: me },
			{ commentId: 'c_mention_third', userId: third },
			{ commentId: 'c_x_mention', userId: me },
		],
		comment_reaction: [
			{ commentId: 'c_my_reply', fileId: 'f_w', userId: other, emoji: '👍' },
			{ commentId: 'c_own', fileId: 'f_home', userId: me, emoji: '👍' },
			{ commentId: 'c_x_reply', fileId: 'f_x', userId: third, emoji: '👍' },
		],
	}

	function seed(rows: Rows) {
		const lc: any = { withContext: () => lc, info() {}, warn() {}, error() {} }
		const db = new Database(lc, ':memory:')
		for (const [name, table] of Object.entries(schema.tables)) {
			const ident = (c: string) => `"${c}"`
			db.exec(`CREATE TABLE "${name}" (${Object.keys(table.columns).map(ident).join(', ')})`)
			db.exec(
				`CREATE UNIQUE INDEX "${name}_pk" ON "${name}" (${table.primaryKey.map(ident).join(', ')})`
			)
			for (const row of rows[name] ?? []) {
				const cols = Object.keys(row)
				db.prepare(
					`INSERT INTO "${name}" (${cols.map(ident).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
				).run(
					...cols.map((c) => {
						const v = row[c]
						const type = (table.columns as Record<string, { type: string }>)[c].type
						return type === 'boolean' ? (v ? 1 : 0) : type === 'json' ? JSON.stringify(v) : v
					})
				)
			}
		}
		return new QueryDelegate(lc, db, schema)
	}

	const delegate = seed(rows)
	async function ids(name: keyof typeof queries) {
		const query = (queries as any)[name].fn({ ctx, args: {} })
		const result = (await delegate.run(query)) as { id: string }[]
		return result.map((c) => c.id).sort()
	}

	it.each([
		['homeBoardComments', ['c_home']],
		['threadStarterComments', ['c_started_reply']],
		['threadParticipantComments', ['c_joined_reply', 'c_joined_root']],
		['mentionComments', ['c_mention']],
		['reactions', ['c_my_reply']],
	] as const)(
		'%s returns exactly its own reason, on boards I can access',
		async (name, expected) => {
			expect(await ids(name)).toEqual(expected)
		}
	)

	// migration 023 is what makes these agree: a trashed board has no access rows left
	it('the feeds together match the deprecated comments query', async () => {
		const union = new Set<string>()
		for (const name of [
			'homeBoardComments',
			'threadStarterComments',
			'threadParticipantComments',
			'mentionComments',
		] as const) {
			for (const id of await ids(name)) union.add(id)
		}
		expect([...union].sort()).toEqual(await ids('comments'))
	})

	it.each([
		['homeBoardComments'],
		['threadStarterComments'],
		['threadParticipantComments'],
		['mentionComments'],
		['comments'],
	] as const)('bounds %s to the most recent comments', (name) => {
		expect(astOf(name).limit).toBe(50)
	})
})
