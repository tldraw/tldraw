import { describe, expect, it } from 'vitest'
import {
	AGENT_COMMENT_HEADER,
	BOARD_SEARCH_MAX_TERMS,
	COMMENT_TEXT_MAX_LENGTH,
	CommentRow,
	CommentThreadRow,
	BOARD_NAME_MAX_LENGTH,
	CreatableWorkspace,
	BOARD_SEARCH_PAGE_SIZE,
	BoardSearchRow,
	buildAgentCommentBody,
	commentBodyToPlainText,
	compareBoardSearchOrder,
	getCommentRefusalMessage,
	getPageCommentsResult,
	getBoardSearchResults,
	isAfterBoardSearchCursor,
	parseCreateBoardInput,
	parseRenameBoardInput,
	parseSearchBoardsInput,
	parseWriteCommentInput,
	resolveCreateBoardWorkspace,
	resolvePage,
} from './boardTools'
import { makeSnapshot } from './screenshotTestHelpers'

function parsedJson(result: ReturnType<typeof getBoardSearchResults>) {
	const block = result.content[0]
	if (block.type !== 'text') throw new Error('Expected a text block')
	return JSON.parse(block.text)
}

function makeRow(overrides: Partial<BoardSearchRow> = {}): BoardSearchRow {
	return {
		id: 'board-1',
		name: 'Roadmap',
		// A board the caller made: arrival and creation are the same moment.
		arrivedAt: 1_700_000_000_000,
		createdAt: 1_700_000_000_000,
		updatedAt: 1_700_000_500_000,
		workspaceName: 'Design',
		source: 'owned' as const,
		...overrides,
	}
}

function makePage(count: number): BoardSearchRow[] {
	return Array.from({ length: count }, (_, index) =>
		makeRow({
			id: `board-${index}`,
			arrivedAt: 1_700_000_000_000 - index,
			createdAt: 1_700_000_000_000 - index,
		})
	)
}

describe('parseSearchBoardsInput', () => {
	// Listing the newest boards is the tool's other job: it is the only way for a model to answer
	// "what boards do I have?" without being handed an id first.
	it('treats a missing query as no filter', () => {
		expect(parseSearchBoardsInput({})).toEqual({ terms: [], cursor: null })
	})

	// The wire-legal call a model makes by following the tool's own description literally: this is
	// the only tool with `required: []`, so omitted `arguments` is a legitimate "list my newest
	// boards", not a malformed call that should hit `requireArgumentsObject(undefined)`.
	it('treats wholly omitted arguments the same as an empty object', () => {
		expect(parseSearchBoardsInput(undefined)).toEqual(parseSearchBoardsInput({}))
	})

	it('treats a whitespace-only query as no filter', () => {
		expect(parseSearchBoardsInput({ query: '   ' }).terms).toEqual([])
	})

	// Terms are ANDed, so word order in the query need not match word order in the name.
	it('splits a query into terms on whitespace', () => {
		expect(parseSearchBoardsInput({ query: 'design  system' }).terms).toEqual(['design', 'system'])
	})

	it('refuses a non-string query', () => {
		expect(() => parseSearchBoardsInput({ query: 12 })).toThrow('query must be a string')
	})

	// A name is a name, not a document: a pasted paragraph is a model mistake, and every term
	// becomes its own ILIKE.
	it('refuses an over-long query', () => {
		expect(() => parseSearchBoardsInput({ query: 'x'.repeat(201) })).toThrow('200 characters')
	})

	// A query length limit alone does not bound term count, since whitespace is cheap: each term
	// becomes its own unindexable ILIKE over an already-unbounded scan.
	it('refuses more than the maximum number of terms', () => {
		const query = Array.from({ length: BOARD_SEARCH_MAX_TERMS + 1 }, (_, i) => `t${i}`).join(' ')
		expect(() => parseSearchBoardsInput({ query })).toThrow(
			`${BOARD_SEARCH_MAX_TERMS} words or fewer`
		)
	})

	it('accepts exactly the maximum number of terms', () => {
		const query = Array.from({ length: BOARD_SEARCH_MAX_TERMS }, (_, i) => `t${i}`).join(' ')
		expect(parseSearchBoardsInput({ query }).terms).toHaveLength(BOARD_SEARCH_MAX_TERMS)
	})

	it('refuses arguments that are not an object', () => {
		expect(() => parseSearchBoardsInput('boards')).toThrow('Tool arguments must be an object')
	})

	// The cursor is opaque so that its scheme can change; a model must only ever hand back one it
	// was given.
	it('round-trips a cursor from a previous result', () => {
		const first = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE + 1), []))
		expect(parseSearchBoardsInput({ cursor: first.nextCursor }).cursor).toEqual({
			arrivedAt: 1_700_000_000_000 - (BOARD_SEARCH_PAGE_SIZE - 1),
			id: `board-${BOARD_SEARCH_PAGE_SIZE - 1}`,
		})
	})

	// A cursor is a position in one query's results. Carried onto a different query it would point
	// at row 20 of a set the model never saw the start of, with nothing in the result to say so.
	it('continues a cursor only under the query that minted it', () => {
		const page = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE + 1), ['design']))
		expect(
			parseSearchBoardsInput({ query: 'design', cursor: page.nextCursor }).cursor
		).not.toBeNull()
		expect(() => parseSearchBoardsInput({ query: 'roadmap', cursor: page.nextCursor })).toThrow(
			'cursor is from a different query'
		)
		expect(() => parseSearchBoardsInput({ cursor: page.nextCursor })).toThrow(
			'cursor is from a different query'
		)
	})

	// Matching is `ilike` and terms are split on whitespace before they are ever compared, so
	// neither case nor spacing changed which boards the cursor was pointing into.
	it('treats a requery that differs only in case or spacing as the same query', () => {
		const page = parsedJson(
			getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE + 1), ['Design', 'System'])
		)
		expect(
			parseSearchBoardsInput({ query: '  design   system ', cursor: page.nextCursor }).cursor
		).not.toBeNull()
	})

	// The other direction of the same rule: "list my newest boards" is a query too, and a cursor
	// into it does not carry over to a search.
	it('refuses a no-query cursor once a query is added', () => {
		const page = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE + 1), []))
		expect(() => parseSearchBoardsInput({ query: 'design', cursor: page.nextCursor })).toThrow(
			'cursor is from a different query'
		)
	})

	// Fixture board ids in the eval harness are arbitrary strings, and `btoa` throws outside Latin-1.
	// That throw would happen inside the route's try block and reach a model as a database failure.
	it('round-trips an id that btoa alone could not encode', () => {
		// The cursor is minted from the last row *on* the page, so the odd id has to sit there.
		const rows = makePage(BOARD_SEARCH_PAGE_SIZE + 1)
		rows[BOARD_SEARCH_PAGE_SIZE - 1] = { ...rows[BOARD_SEARCH_PAGE_SIZE - 1], id: 'brädå:1' }
		const result = parsedJson(getBoardSearchResults(rows, []))
		expect(parseSearchBoardsInput({ cursor: result.nextCursor }).cursor).toEqual({
			arrivedAt: 1_700_000_000_000 - (BOARD_SEARCH_PAGE_SIZE - 1),
			id: 'brädå:1',
		})
	})

	// Every fixture below carries the trailing `:` that makes it a three-field cursor. Without it the
	// field-count check refuses them first, and the guard each case names is never reached — which is
	// what happened when the cursor grew its query field and these were not revisited: deleting the
	// timestamp validation outright left all of them green.
	//
	// Nothing downstream can act on a malformed cursor, and silently starting from the first page
	// would look to a model like the last page repeating itself.
	it('refuses a cursor it did not issue', () => {
		expect(() => parseSearchBoardsInput({ cursor: 'not-a-cursor' })).toThrow('cursor is not valid')
		expect(() => parseSearchBoardsInput({ cursor: btoa('nonsense') })).toThrow(
			'cursor is not valid'
		)
		expect(() => parseSearchBoardsInput({ cursor: 12 })).toThrow('cursor must be a string')
		expect(() => parseSearchBoardsInput({ cursor: btoa('1:%zz:') })).toThrow('cursor is not valid')
	})

	// `Number.isInteger` admits 1e300, which binds as an out-of-range int8 and makes Postgres throw:
	// caller garbage would reach a model as "the board database could not be reached".
	it('refuses a sort key no timestamp could be', () => {
		expect(() => parseSearchBoardsInput({ cursor: btoa('1e300:board-1:') })).toThrow(
			'cursor is not valid'
		)
		expect(() => parseSearchBoardsInput({ cursor: btoa('-1:board-1:') })).toThrow(
			'cursor is not valid'
		)
	})

	// `Number('')` is 0, which passes `Number.isSafeInteger(0)`: the forged cursor `btoa(":id:")`
	// would otherwise decode to `{createdAt: 0, id: 'id'}` and seek strictly below epoch forever,
	// with no signal to the model that its cursor was the problem.
	it('refuses a cursor with an empty timestamp half', () => {
		expect(() => parseSearchBoardsInput({ cursor: btoa(':board-1:') })).toThrow(
			'cursor is not valid'
		)
	})

	// The digit check admits any run of digits, including one past MAX_SAFE_INTEGER. That binds as an
	// out-of-range int8 and makes Postgres throw, so caller garbage would reach a model as "the board
	// database could not be reached" rather than as a bad cursor. This is the case
	// `Number.isSafeInteger` is there for: `1e300` is refused a line earlier, for not being digits.
	it('refuses an all-digit timestamp too large to be a safe integer', () => {
		expect(() => parseSearchBoardsInput({ cursor: btoa('99999999999999999999:board-1:') })).toThrow(
			'cursor is not valid'
		)
	})

	// The id half is what makes "where the page ended" a single point rather than a range. Empty, the
	// cursor would seek on createdAt alone, and every board sharing that timestamp would be re-served
	// or skipped at the boundary.
	it('refuses a cursor with an empty id half', () => {
		expect(() => parseSearchBoardsInput({ cursor: btoa('1::') })).toThrow('cursor is not valid')
	})

	// Every other string form `Number()` coerces to a finite value but a plain-digit timestamp
	// never is.
	it.each(['1e3', ' 5', '+5', 'Infinity'])(
		'refuses a timestamp half of %j, which Number() would otherwise accept',
		(timestampPart) => {
			expect(() => parseSearchBoardsInput({ cursor: btoa(`${timestampPart}:board-1:`) })).toThrow(
				'cursor is not valid'
			)
		}
	)
})

// The one statement of result order. The SQL in searchBoards.ts mirrors this, and the eval harness
// pages through fixtures with it — if the two disagree, an eval stops being evidence.
describe('compareBoardSearchOrder', () => {
	it('puts the newest-created board first', () => {
		expect(
			compareBoardSearchOrder({ arrivedAt: 2, id: 'a' }, { arrivedAt: 1, id: 'a' })
		).toBeLessThan(0)
	})

	// Boards created in one batch share a createdAt. Without a unique tiebreaker the cursor cannot
	// say where a page ended inside that group.
	it('breaks a tie on id, descending', () => {
		expect(
			compareBoardSearchOrder({ arrivedAt: 0, id: 'b' }, { arrivedAt: 0, id: 'a' })
		).toBeLessThan(0)
		expect(compareBoardSearchOrder({ arrivedAt: 0, id: 'a' }, { arrivedAt: 0, id: 'a' })).toBe(0)
	})

	it('sorts an older board after a newer one whatever their ids', () => {
		expect(
			compareBoardSearchOrder({ arrivedAt: 0, id: 'z' }, { arrivedAt: 1, id: 'a' })
		).toBeGreaterThan(0)
	})
})

describe('isAfterBoardSearchCursor', () => {
	it('accepts only rows that sort after the cursor', () => {
		const cursor = { arrivedAt: 10, id: 'm' }
		expect(isAfterBoardSearchCursor({ arrivedAt: 9, id: 'z' }, cursor)).toBe(true)
		expect(isAfterBoardSearchCursor({ arrivedAt: 11, id: 'a' }, cursor)).toBe(false)
	})

	// The point of ordering on arrival rather than creation: a board somebody shared with you this
	// morning leads the list, however long ago its owner made it. Under a createdAt sort it would land
	// below everything you have made since, which for a long-lived board is the bottom of the page.
	it('puts a recently shared old board above a board made earlier today', () => {
		const sharedThisMorning = { arrivedAt: 1_700_000_000_000, id: 'shared' }
		const mineFromLastWeek = { arrivedAt: 1_699_000_000_000, id: 'mine' }
		expect(compareBoardSearchOrder(sharedThisMorning, mineFromLastWeek)).toBeLessThan(0)
	})

	// Descending order means "after" is "less than". Reversed, a page returns itself forever.
	it('excludes the cursor row itself and takes the tie on id', () => {
		const cursor = { arrivedAt: 10, id: 'm' }
		expect(isAfterBoardSearchCursor(cursor, cursor)).toBe(false)
		expect(isAfterBoardSearchCursor({ arrivedAt: 10, id: 'l' }, cursor)).toBe(true)
		expect(isAfterBoardSearchCursor({ arrivedAt: 10, id: 'n' }, cursor)).toBe(false)
	})
})

describe('getBoardSearchResults', () => {
	it('shapes a board for the model', () => {
		const result = parsedJson(getBoardSearchResults([makeRow()], []))
		expect(result).toEqual({
			boardCount: 1,
			boards: [
				{
					boardId: 'board-1',
					name: 'Roadmap',
					// Same instant for a board the caller made; they diverge only for a shared one.
					addedAt: '2023-11-14T22:13:20.000Z',
					createdAt: '2023-11-14T22:13:20.000Z',
					updatedAt: '2023-11-14T22:21:40.000Z',
					source: 'owned',
				},
			],
		})
	})

	// "My workspace" on every row of the common case is noise; on a shared workspace's board it is
	// the thing that identifies where the board lives.
	it('names the workspace only on boards outside the caller’s own', () => {
		const result = parsedJson(getBoardSearchResults([makeRow({ source: 'workspace' })], []))
		expect(result.boards[0]).toMatchObject({ source: 'workspace', workspaceName: 'Design' })
	})

	// A link-shared board is owned by a workspace the caller is not in. Reporting its name would hand
	// somebody who was given a link the name of an organisation they have no seat in.
	it('withholds the workspace name from a link-shared board', () => {
		const result = parsedJson(getBoardSearchResults([makeRow({ source: 'shared' })], []))
		expect(result.boards[0].source).toBe('shared')
		expect(result.boards[0]).not.toHaveProperty('workspaceName')
	})

	// An unnamed board is titled by its creation date on tldraw.com, in the viewer's locale and
	// timezone. A stand-in title invented here would be one the caller never sees on their own
	// screen, and one no query could match, since the column holds ''.
	it('reports a blank name as blank rather than inventing one', () => {
		const result = parsedJson(getBoardSearchResults([makeRow({ name: '  ' })], []))
		expect(result.boards[0].name).toBe('')
	})

	// The query asks for one row more than a page so that "is there another page" needs no second
	// count. The extra row must never be shown.
	it('serves one page and a cursor from the surplus row', () => {
		const result = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE + 1), []))
		expect(result.boardCount).toBe(BOARD_SEARCH_PAGE_SIZE)
		expect(result.boards).toHaveLength(BOARD_SEARCH_PAGE_SIZE)
		expect(result.nextCursor).toEqual(expect.any(String))
		expect(result.boards.at(-1).boardId).toBe(`board-${BOARD_SEARCH_PAGE_SIZE - 1}`)
	})

	// A cursor on the last page would have a model fetch an empty page to discover it had finished.
	it('omits the cursor on the last page', () => {
		const result = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE), []))
		expect(result.boardCount).toBe(BOARD_SEARCH_PAGE_SIZE)
		expect(result.nextCursor).toBeUndefined()
	})

	// An empty result is a normal result. Models treat isError as failure and retry it.
	it('returns an empty result rather than an error', () => {
		const result = getBoardSearchResults([], [])
		expect(result.isError).toBeUndefined()
		expect(parsedJson(result)).toEqual({ boardCount: 0, boards: [] })
	})
})

describe('parseCreateBoardInput', () => {
	it('trims the name and treats a missing or blank workspace as the personal one', () => {
		expect(parseCreateBoardInput({ name: '  Roadmap  ' })).toEqual({
			name: 'Roadmap',
			workspace: null,
		})
		expect(parseCreateBoardInput({ name: 'Roadmap', workspace: '  ' })).toEqual({
			name: 'Roadmap',
			workspace: null,
		})
		expect(parseCreateBoardInput({ name: 'Roadmap', workspace: ' Design ' })).toEqual({
			name: 'Roadmap',
			workspace: 'Design',
		})
	})

	it('rejects a missing, blank, overlong or non-string name, and a non-string workspace', () => {
		expect(() => parseCreateBoardInput({})).toThrow('name is required')
		expect(() => parseCreateBoardInput({ name: '   ' })).toThrow('name is required')
		expect(() => parseCreateBoardInput({ name: 'x'.repeat(BOARD_NAME_MAX_LENGTH + 1) })).toThrow(
			`at most ${BOARD_NAME_MAX_LENGTH}`
		)
		expect(() => parseCreateBoardInput({ name: 'Roadmap', workspace: 3 })).toThrow(
			'workspace must be'
		)
	})
})

describe('parseRenameBoardInput', () => {
	it('trims the name', () => {
		expect(parseRenameBoardInput({ boardId: 'board_abc', name: '  Roadmap ' })).toEqual({
			boardId: 'board_abc',
			name: 'Roadmap',
		})
	})

	it('rejects a missing board id, a URL, and a missing, blank or overlong name', () => {
		expect(() => parseRenameBoardInput({ name: 'Roadmap' })).toThrow('boardId is required')
		expect(() =>
			parseRenameBoardInput({ boardId: 'https://www.tldraw.com/f/abc', name: 'Roadmap' })
		).toThrow('not a URL')
		expect(() => parseRenameBoardInput({ boardId: 'board_abc' })).toThrow('name is required')
		expect(() => parseRenameBoardInput({ boardId: 'board_abc', name: ' ' })).toThrow(
			'name is required'
		)
		expect(() =>
			parseRenameBoardInput({ boardId: 'board_abc', name: 'x'.repeat(BOARD_NAME_MAX_LENGTH + 1) })
		).toThrow(`at most ${BOARD_NAME_MAX_LENGTH}`)
	})
})

describe('resolveCreateBoardWorkspace', () => {
	const PERSONAL: CreatableWorkspace = { id: 'user-1', name: 'My workspace', personal: true }
	const DESIGN: CreatableWorkspace = { id: 'group-design', name: 'Design', personal: false }
	const DESIGN_TOO: CreatableWorkspace = { id: 'group-design-2', name: 'design', personal: false }

	function errorText(result: ReturnType<typeof resolveCreateBoardWorkspace>) {
		if (result.ok) throw new Error('Expected a refusal')
		const block = result.result.content[0]
		if (block.type !== 'text') throw new Error('Expected a text block')
		return block.text
	}

	it('uses the personal workspace when none is named', () => {
		expect(resolveCreateBoardWorkspace([DESIGN, PERSONAL], null)).toEqual({
			ok: true,
			workspace: PERSONAL,
		})
	})

	it('matches a name case-insensitively, or an exact id', () => {
		expect(resolveCreateBoardWorkspace([PERSONAL, DESIGN], 'DESIGN')).toEqual({
			ok: true,
			workspace: DESIGN,
		})
		expect(resolveCreateBoardWorkspace([PERSONAL, DESIGN, DESIGN_TOO], 'group-design-2')).toEqual({
			ok: true,
			workspace: DESIGN_TOO,
		})
	})

	// A name two workspaces share cannot be guessed at: the board would land somewhere the caller
	// did not mean, so the refusal hands back the ids that tell them apart.
	it('refuses an ambiguous name and names the ids to choose between', () => {
		const result = resolveCreateBoardWorkspace([PERSONAL, DESIGN, DESIGN_TOO], 'Design')
		expect(result).toMatchObject({ ok: false, reason: 'workspace_ambiguous' })
		expect(errorText(result)).toContain('group-design')
		expect(errorText(result)).toContain('group-design-2')
	})

	it('refuses an unknown workspace and lists the ones that would work', () => {
		const result = resolveCreateBoardWorkspace([PERSONAL, DESIGN], 'Marketing')
		expect(result).toMatchObject({ ok: false, reason: 'workspace_not_found' })
		expect(errorText(result)).toContain('"Design" (id: group-design)')
		expect(errorText(result)).toContain('"My workspace" (id: user-1, personal)')
	})
})

describe('parseWriteCommentInput', () => {
	it('takes a reply, a shape or a point, adding the record prefix an id was given without', () => {
		expect(parseWriteCommentInput({ boardId: 'b', text: ' Done ', threadId: 'abc' })).toEqual({
			boardId: 'b',
			text: 'Done',
			target: { kind: 'reply', threadId: 'comment-thread:abc' },
		})
		expect(
			parseWriteCommentInput({ boardId: 'b', text: 'Hi', shapeId: 'shape:box', page: 0 })
		).toEqual({ boardId: 'b', text: 'Hi', target: { kind: 'shape', shapeId: 'shape:box' } })
		expect(
			parseWriteCommentInput({ boardId: 'b', text: 'Hi', x: 10.5, y: -4, page: 'page:two' })
		).toEqual({
			boardId: 'b',
			text: 'Hi',
			target: { kind: 'point', page: { kind: 'id', id: 'page:two' }, x: 10.5, y: -4 },
		})
	})

	// A blank string is what a model sends for a field it meant to leave out.
	it('reads a blank target field as absent', () => {
		expect(
			parseWriteCommentInput({ boardId: 'b', text: 'Hi', threadId: 'abc', shapeId: '' }).target
		).toEqual({ kind: 'reply', threadId: 'comment-thread:abc' })
	})

	it('refuses no target, more than one, half a point, and missing or overlong text', () => {
		expect(() => parseWriteCommentInput({ boardId: 'b', text: 'Hi' })).toThrow('Say where')
		expect(() =>
			parseWriteCommentInput({ boardId: 'b', text: 'Hi', threadId: 't', shapeId: 's' })
		).toThrow('only one of')
		expect(() => parseWriteCommentInput({ boardId: 'b', text: 'Hi', shapeId: 's', x: 1 })).toThrow(
			'only one of'
		)
		expect(() => parseWriteCommentInput({ boardId: 'b', text: 'Hi', x: 1 })).toThrow(
			'x and y must both be numbers'
		)
		expect(() => parseWriteCommentInput({ boardId: 'b', text: ' ', threadId: 't' })).toThrow(
			'text is required'
		)
		expect(() =>
			parseWriteCommentInput({
				boardId: 'b',
				text: 'x'.repeat(COMMENT_TEXT_MAX_LENGTH + 1),
				threadId: 't',
			})
		).toThrow(`at most ${COMMENT_TEXT_MAX_LENGTH}`)
		expect(() => parseWriteCommentInput({ text: 'Hi', threadId: 't' })).toThrow(
			'boardId is required'
		)
	})
})

describe('buildAgentCommentBody', () => {
	// Real italics in the rich text, not asterisks a reader would see literally.
	it('opens with the header as an italic paragraph of its own, then one paragraph per line', () => {
		expect(buildAgentCommentBody('First line\n\nThird *line*')).toEqual({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: AGENT_COMMENT_HEADER, marks: [{ type: 'italic' }] }],
				},
				{ type: 'paragraph', content: [{ type: 'text', text: 'First line' }] },
				{ type: 'paragraph' },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Third *line*' }] },
			],
		})
		expect(AGENT_COMMENT_HEADER).toBe('Comment left by my agent')
	})
})

describe('commentBodyToPlainText', () => {
	it('puts blocks on their own lines and spells mentions out', () => {
		expect(
			commentBodyToPlainText({
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Hey ' },
							{ type: 'mention', attrs: { id: 'user_1', label: 'Ada' } },
							{ type: 'text', text: ', look', marks: [{ type: 'bold' }] },
						],
					},
					{
						type: 'bulletList',
						content: [
							{
								type: 'listItem',
								content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
							},
							{
								type: 'listItem',
								content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
							},
						],
					},
				],
			})
		).toBe('Hey @Ada, look\none\ntwo')
		expect(commentBodyToPlainText(buildAgentCommentBody('Done'))).toBe(
			`${AGENT_COMMENT_HEADER}\nDone`
		)
	})
})

describe('getPageCommentsResult', () => {
	const snapshot = makeSnapshot([{ id: 'page:a', index: 'a1', name: 'Cover', shapes: 1 }])
	// A shape with a label, so the anchor can say what it is.
	snapshot.documents[2].state.props.richText = {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Login' }] }],
	}
	const page = resolvePage(snapshot, { kind: 'ordinal', ordinal: 0 })
	if (!page.ok) throw new Error('Expected the page to resolve')

	function thread(overrides: Partial<CommentThreadRow>): CommentThreadRow {
		return {
			id: 'comment-thread:t',
			anchor: { type: 'page' },
			resolvedAt: null,
			createdAt: 1,
			...overrides,
		}
	}
	function comment(overrides: Partial<CommentRow>): CommentRow {
		return {
			id: 'comment:c',
			threadId: 'comment-thread:t',
			authorId: 'user_other',
			authorName: 'Ada',
			body: buildAgentCommentBody('x'),
			createdAt: Date.UTC(2026, 0, 1),
			...overrides,
		}
	}

	it('names the shape a thread is on, rounds page points, and marks the caller’s own comments', () => {
		const result = getPageCommentsResult(
			page,
			[
				thread({
					id: 'comment-thread:point',
					anchor: { type: 'point', x: 10.4, y: 19.6 },
					resolvedAt: 5,
					createdAt: 2,
				}),
				thread({
					id: 'comment-thread:shape',
					anchor: { type: 'shape', shapeId: 'shape:page:a-0', x: 0.25, y: 0.5, isPrecise: true },
					createdAt: 1,
				}),
				thread({
					id: 'comment-thread:gone',
					anchor: { type: 'shape', shapeId: 'shape:deleted', x: 1, y: 0, isPrecise: false },
					createdAt: 3,
				}),
				// No live comment, so tldraw.com shows nothing: left out.
				thread({ id: 'comment-thread:empty', createdAt: 4 }),
			],
			[
				comment({
					id: 'comment:reply',
					threadId: 'comment-thread:shape',
					authorId: 'user_me',
					authorName: 'Me',
					body: buildAgentCommentBody('On it'),
					createdAt: Date.UTC(2026, 0, 2),
				}),
				comment({
					id: 'comment:first',
					threadId: 'comment-thread:shape',
					body: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Wider?' }] }],
					},
				}),
				comment({ id: 'comment:p', threadId: 'comment-thread:point', authorName: ' ' }),
				comment({ id: 'comment:g', threadId: 'comment-thread:gone' }),
			],
			'user_me'
		)
		const block = result.content[0]
		if (block.type !== 'text') throw new Error('Expected a text block')
		expect(JSON.parse(block.text)).toEqual({
			pageId: 'page:a',
			pageName: 'Cover',
			threadCount: 3,
			threads: [
				{
					threadId: 'comment-thread:shape',
					resolved: false,
					anchor: {
						type: 'shape',
						shapeId: 'shape:page:a-0',
						shapeType: 'geo',
						shapeText: 'Login',
					},
					comments: [
						{
							commentId: 'comment:first',
							authorName: 'Ada',
							isCurrentUser: false,
							createdAt: '2026-01-01T00:00:00.000Z',
							text: 'Wider?',
						},
						{
							commentId: 'comment:reply',
							authorName: 'Me',
							isCurrentUser: true,
							createdAt: '2026-01-02T00:00:00.000Z',
							text: `${AGENT_COMMENT_HEADER}\nOn it`,
						},
					],
				},
				{
					threadId: 'comment-thread:point',
					resolved: true,
					anchor: { type: 'point', x: 10, y: 20 },
					comments: [expect.objectContaining({ commentId: 'comment:p', authorName: 'Someone' })],
				},
				{
					threadId: 'comment-thread:gone',
					resolved: false,
					anchor: { type: 'shape', shapeId: 'shape:deleted', shapeMissing: true },
					comments: [expect.objectContaining({ commentId: 'comment:g' })],
				},
			],
		})
	})
})

describe('getCommentRefusalMessage', () => {
	it('words each refusal so a model knows what to do next', () => {
		expect(getCommentRefusalMessage({ reason: 'comment_forbidden' })).toContain('view-only link')
		expect(
			getCommentRefusalMessage({ reason: 'thread_resolved', threadId: 'comment-thread:t' })
		).toContain('Start a new thread instead')
		expect(
			getCommentRefusalMessage({ reason: 'thread_not_found', threadId: 'comment-thread:t' })
		).toContain('read_page_comments')
		expect(
			getCommentRefusalMessage({
				reason: 'page_not_found',
				page: { kind: 'ordinal', ordinal: 4 },
				pageCount: 2,
			})
		).toContain('Page 4 is out of range')
	})
})
