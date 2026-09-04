import { describe, expect, it } from 'vitest'
import {
	BOARD_SEARCH_MAX_TERMS,
	BOARD_SEARCH_PAGE_SIZE,
	BoardSearchRow,
	compareBoardSearchOrder,
	getBoardSearchResults,
	isAfterBoardSearchCursor,
	parseSearchBoardsInput,
} from './boardTools'

function parsedJson(result: ReturnType<typeof getBoardSearchResults>) {
	const block = result.content[0]
	if (block.type !== 'text') throw new Error('Expected a text block')
	return JSON.parse(block.text)
}

function makeRow(overrides: Partial<BoardSearchRow> = {}): BoardSearchRow {
	return {
		id: 'board-1',
		name: 'Roadmap',
		createdAt: 1_700_000_000_000,
		updatedAt: 1_700_000_500_000,
		workspaceName: 'Design',
		isPersonal: true,
		...overrides,
	}
}

function makePage(count: number): BoardSearchRow[] {
	return Array.from({ length: count }, (_, index) =>
		makeRow({ id: `board-${index}`, createdAt: 1_700_000_000_000 - index })
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
		const first = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE + 1)))
		expect(parseSearchBoardsInput({ cursor: first.nextCursor }).cursor).toEqual({
			createdAt: 1_700_000_000_000 - (BOARD_SEARCH_PAGE_SIZE - 1),
			id: `board-${BOARD_SEARCH_PAGE_SIZE - 1}`,
		})
	})

	// Fixture board ids in the eval harness are arbitrary strings, and `btoa` throws outside Latin-1.
	// That throw would happen inside the route's try block and reach a model as a database failure.
	it('round-trips an id that btoa alone could not encode', () => {
		// The cursor is minted from the last row *on* the page, so the odd id has to sit there.
		const rows = makePage(BOARD_SEARCH_PAGE_SIZE + 1)
		rows[BOARD_SEARCH_PAGE_SIZE - 1] = { ...rows[BOARD_SEARCH_PAGE_SIZE - 1], id: 'brädå:1' }
		const result = parsedJson(getBoardSearchResults(rows))
		expect(parseSearchBoardsInput({ cursor: result.nextCursor }).cursor).toEqual({
			createdAt: 1_700_000_000_000 - (BOARD_SEARCH_PAGE_SIZE - 1),
			id: 'brädå:1',
		})
	})

	// Nothing downstream can act on a malformed cursor, and silently starting from the first page
	// would look to a model like the last page repeating itself.
	it('refuses a cursor it did not issue', () => {
		expect(() => parseSearchBoardsInput({ cursor: 'not-a-cursor' })).toThrow('cursor is not valid')
		expect(() => parseSearchBoardsInput({ cursor: btoa('nonsense') })).toThrow(
			'cursor is not valid'
		)
		expect(() => parseSearchBoardsInput({ cursor: 12 })).toThrow('cursor must be a string')
		expect(() => parseSearchBoardsInput({ cursor: btoa('1:%zz') })).toThrow('cursor is not valid')
	})

	// `Number.isInteger` admits 1e300, which binds as an out-of-range int8 and makes Postgres throw:
	// caller garbage would reach a model as "the board database could not be reached".
	it('refuses a sort key no timestamp could be', () => {
		expect(() => parseSearchBoardsInput({ cursor: btoa('1e300:board-1') })).toThrow(
			'cursor is not valid'
		)
		expect(() => parseSearchBoardsInput({ cursor: btoa('-1:board-1') })).toThrow(
			'cursor is not valid'
		)
	})

	// `Number('')` is 0, which passes `Number.isSafeInteger(0)`: the forged cursor `btoa(":id")`
	// would otherwise decode to `{createdAt: 0, id: 'id'}` and seek strictly below epoch forever,
	// with no signal to the model that its cursor was the problem.
	it('refuses a cursor with an empty timestamp half', () => {
		expect(() => parseSearchBoardsInput({ cursor: btoa(':board-1') })).toThrow(
			'cursor is not valid'
		)
	})

	// Every other string form `Number()` coerces to a finite value but a plain-digit timestamp
	// never is.
	it.each(['1e3', ' 5', '+5', 'Infinity'])(
		'refuses a timestamp half of %j, which Number() would otherwise accept',
		(timestampPart) => {
			expect(() => parseSearchBoardsInput({ cursor: btoa(`${timestampPart}:board-1`) })).toThrow(
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
			compareBoardSearchOrder({ createdAt: 2, id: 'a' }, { createdAt: 1, id: 'a' })
		).toBeLessThan(0)
	})

	// Boards created in one batch share a createdAt. Without a unique tiebreaker the cursor cannot
	// say where a page ended inside that group.
	it('breaks a tie on id, descending', () => {
		expect(
			compareBoardSearchOrder({ createdAt: 0, id: 'b' }, { createdAt: 0, id: 'a' })
		).toBeLessThan(0)
		expect(compareBoardSearchOrder({ createdAt: 0, id: 'a' }, { createdAt: 0, id: 'a' })).toBe(0)
	})

	it('sorts an older board after a newer one whatever their ids', () => {
		expect(
			compareBoardSearchOrder({ createdAt: 0, id: 'z' }, { createdAt: 1, id: 'a' })
		).toBeGreaterThan(0)
	})
})

describe('isAfterBoardSearchCursor', () => {
	it('accepts only rows that sort after the cursor', () => {
		const cursor = { createdAt: 10, id: 'm' }
		expect(isAfterBoardSearchCursor({ createdAt: 9, id: 'z' }, cursor)).toBe(true)
		expect(isAfterBoardSearchCursor({ createdAt: 11, id: 'a' }, cursor)).toBe(false)
	})

	// Descending order means "after" is "less than". Reversed, a page returns itself forever.
	it('excludes the cursor row itself and takes the tie on id', () => {
		const cursor = { createdAt: 10, id: 'm' }
		expect(isAfterBoardSearchCursor(cursor, cursor)).toBe(false)
		expect(isAfterBoardSearchCursor({ createdAt: 10, id: 'l' }, cursor)).toBe(true)
		expect(isAfterBoardSearchCursor({ createdAt: 10, id: 'n' }, cursor)).toBe(false)
	})
})

describe('getBoardSearchResults', () => {
	it('shapes a board for the model', () => {
		const result = parsedJson(getBoardSearchResults([makeRow()]))
		expect(result).toEqual({
			boardCount: 1,
			boards: [
				{
					boardId: 'board-1',
					name: 'Roadmap',
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
		const result = parsedJson(getBoardSearchResults([makeRow({ isPersonal: false })]))
		expect(result.boards[0]).toMatchObject({ source: 'workspace', workspaceName: 'Design' })
	})

	// tldraw.com renders a blank file name as "Untitled", so a result showing '' would name boards
	// differently from the app the caller found them in.
	it('falls back to Untitled for a blank name', () => {
		const result = parsedJson(getBoardSearchResults([makeRow({ name: '  ' })]))
		expect(result.boards[0].name).toBe('Untitled')
	})

	// The query asks for one row more than a page so that "is there another page" needs no second
	// count. The extra row must never be shown.
	it('serves one page and a cursor from the surplus row', () => {
		const result = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE + 1)))
		expect(result.boardCount).toBe(BOARD_SEARCH_PAGE_SIZE)
		expect(result.boards).toHaveLength(BOARD_SEARCH_PAGE_SIZE)
		expect(result.nextCursor).toEqual(expect.any(String))
		expect(result.boards.at(-1).boardId).toBe(`board-${BOARD_SEARCH_PAGE_SIZE - 1}`)
	})

	// A cursor on the last page would have a model fetch an empty page to discover it had finished.
	it('omits the cursor on the last page', () => {
		const result = parsedJson(getBoardSearchResults(makePage(BOARD_SEARCH_PAGE_SIZE)))
		expect(result.boardCount).toBe(BOARD_SEARCH_PAGE_SIZE)
		expect(result.nextCursor).toBeUndefined()
	})

	// An empty result is a normal result. Models treat isError as failure and retry it.
	it('returns an empty result rather than an error', () => {
		const result = getBoardSearchResults([])
		expect(result.isError).toBeUndefined()
		expect(parsedJson(result)).toEqual({ boardCount: 0, boards: [] })
	})
})
