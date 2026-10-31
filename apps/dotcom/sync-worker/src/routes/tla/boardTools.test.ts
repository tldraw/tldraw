import { describe, expect, it } from 'vitest'
import {
	BOARD_SEARCH_MAX_TERMS,
	BOARD_NAME_MAX_LENGTH,
	CreatableWorkspace,
	BOARD_SEARCH_PAGE_SIZE,
	BoardSearchRow,
	CLUSTER_INFO_MAX_SHAPES,
	ShapeMeasurement,
	clusterPage,
	compareBoardSearchOrder,
	getClusterInfo,
	getBoardSearchResults,
	isAfterBoardSearchCursor,
	parseCreateBoardInput,
	parseRenameBoardInput,
	parseSearchBoardsInput,
	resolveCreateBoardWorkspace,
	resolvePage,
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

describe('getClusterInfo', () => {
	const PAGE = 'page:a'

	function shape(id: string, overrides: Record<string, unknown> = {}) {
		return {
			typeName: 'shape',
			id,
			parentId: PAGE,
			type: 'geo',
			index: 'a1',
			x: 0,
			y: 0,
			rotation: 0,
			opacity: 1,
			isLocked: false,
			meta: {},
			props: { w: 100, h: 100, scale: 1 },
			...overrides,
		}
	}

	function arrowBinding(id: string, arrowId: string, toId: string, terminal: 'start' | 'end') {
		return {
			typeName: 'binding',
			id,
			type: 'arrow',
			fromId: arrowId,
			toId,
			meta: {},
			props: {
				terminal,
				normalizedAnchor: { x: 0.25, y: 0.333333 },
				isPrecise: true,
				isExact: false,
				snap: 'none',
			},
		}
	}

	// A frame turned a quarter turn, holding a box; two boxes joined by a bound arrow; and a free arrow
	// inside the frame. Every case a stored record gets wrong without page space.
	const records = [
		{ typeName: 'document', id: 'document:document', name: 'Board' },
		{ typeName: 'page', id: PAGE, name: 'Cover', index: 'a1' },
		shape('shape:frame', {
			type: 'frame',
			x: 1000.4,
			y: 500.6,
			rotation: Math.PI / 2,
			props: { w: 400.4, h: 299.7, name: 'Flow' },
		}),
		shape('shape:inner', { parentId: 'shape:frame', x: 10, y: 20, opacity: 0.55 }),
		shape('shape:free', {
			type: 'arrow',
			parentId: 'shape:frame',
			x: 50,
			y: 0,
			props: {
				kind: 'arc',
				start: { x: 0, y: 0 },
				end: { x: 100, y: 0 },
				bend: 12.345678901234567,
				labelPosition: 0.5,
				elbowMidPoint: 0.5,
				scale: 1.5,
			},
		}),
		shape('shape:a', { x: 0, y: 0 }),
		shape('shape:b', { x: 400, y: 0 }),
		shape('shape:bound', {
			type: 'arrow',
			props: {
				kind: 'arc',
				start: { x: 0, y: 0 },
				end: { x: 2, y: 0 },
				bend: 0,
				labelPosition: 0.5,
				elbowMidPoint: 0.5,
				scale: 1,
			},
		}),
		arrowBinding('binding:start', 'shape:bound', 'shape:a', 'start'),
		arrowBinding('binding:end', 'shape:bound', 'shape:b', 'end'),
	]
	const snapshot = { documents: records.map((state) => ({ state })), schema: {} } as any

	const MEASUREMENTS: Record<string, ShapeMeasurement> = {
		'shape:frame': { minX: 700.4, minY: 500.6, maxX: 1000.4, maxY: 900.6 },
		'shape:inner': { minX: 880.4, minY: 510.6, maxX: 980.4, maxY: 610.6 },
		'shape:free': { minX: 999.6, minY: 550.6, maxX: 1001.2, maxY: 650.6 },
		'shape:a': { minX: 0, minY: 0, maxX: 100, maxY: 100, text: 'Start' },
		'shape:b': { minX: 400, minY: 0, maxX: 500, maxY: 100 },
		'shape:bound': {
			minX: 100.2,
			minY: 49.5,
			maxX: 399.7,
			maxY: 50.5,
			arrow: {
				start: { x: 100.2, y: 50.1 },
				end: { x: 399.7, y: 49.9 },
				label: { x: 250.4, y: 50 },
			},
		},
	}

	const FIRST_PAGE = { kind: 'ordinal', ordinal: 0 } as const

	function clusteredPage(source: any, measurements: Record<string, ShapeMeasurement>) {
		const page = resolvePage(source, FIRST_PAGE)
		if (!page.ok) throw new Error('Expected the page to resolve')
		return { page, clustering: { clusters: clusterPage(page, measurements), measurements } }
	}

	function textOf(result: { content: ReturnType<typeof getBoardSearchResults>['content'] }) {
		const block = result.content[0]
		if (block.type !== 'text') throw new Error('Expected a text block')
		return block.text
	}

	function clusterIdOf(
		clustering: ReturnType<typeof clusteredPage>['clustering'],
		shapeId: string
	): string {
		return clustering.clusters.find((c) => c.shapes.some((s) => s.id === shapeId))!.id
	}

	function shapesOfCluster(measurements: Record<string, ShapeMeasurement>, shapeId: string) {
		const { page, clustering } = clusteredPage(snapshot, measurements)
		const info = getClusterInfo(page, clustering, [clusterIdOf(clustering, shapeId)], FIRST_PAGE)
		if (!info.ok) throw new Error('Expected the cluster to resolve')
		const shapes = JSON.parse(textOf(info.result)).clusters[0].shapes as any[]
		return (id: string) => shapes.find((s) => s.id === id)
	}

	// Pages built from boxes far enough apart that each top-level shape is its own cluster, unless it
	// is a frame holding children.
	function farApart(shapes: Record<string, unknown>[]) {
		const all = [records[0], records[1], ...shapes]
		const measurements: Record<string, ShapeMeasurement> = {}
		const byId = new Map((shapes as any[]).map((record) => [record.id, record]))
		for (const record of shapes as any[]) {
			// One level of nesting is all these pages use, and none of them rotate.
			const x = record.x + (byId.get(record.parentId)?.x ?? 0)
			measurements[record.id] = { minX: x, minY: 0, maxX: x + record.props.w, maxY: 100 }
		}
		return {
			snapshot: { documents: all.map((state) => ({ state })), schema: {} } as any,
			measurements,
		}
	}

	it('answers several clusters in the order asked, each in the single-cluster shape', () => {
		const board = farApart([
			shape('shape:one', { x: 0 }),
			shape('shape:frame', { type: 'frame', x: 100_000, props: { w: 400, h: 100, name: 'F' } }),
			shape('shape:child', { parentId: 'shape:frame', x: 10, y: 10 }),
			shape('shape:three', { x: 200_000 }),
		])
		const { page, clustering } = clusteredPage(board.snapshot, board.measurements)
		const ids = ['shape:three', 'shape:frame', 'shape:one'].map((id) => clusterIdOf(clustering, id))
		expect(new Set(ids).size).toBe(3)

		const info = getClusterInfo(page, clustering, ids, FIRST_PAGE)
		if (!info.ok) throw new Error('Expected the clusters to resolve')
		const answer = JSON.parse(textOf(info.result))

		expect(answer.pageName).toBe('Cover')
		expect(answer.clusters.map((c: any) => c.clusterId)).toEqual(ids)
		expect(answer.clusters.map((c: any) => c.shapes.map((s: any) => s.id))).toEqual([
			['shape:three'],
			['shape:frame', 'shape:child'],
			['shape:one'],
		])
		expect(Object.keys(answer.clusters[0])).toEqual([
			'clusterId',
			'label',
			'keywords',
			'numberOfShapes',
			'shapes',
		])
		// A cluster read alongside others reads exactly as it does on its own.
		const alone = getClusterInfo(page, clustering, [ids[1]], FIRST_PAGE)
		if (!alone.ok) throw new Error('Expected the cluster to resolve')
		expect(answer.clusters[1]).toEqual(JSON.parse(textOf(alone.result)).clusters[0])
	})

	it('refuses the whole call when any id is unknown, naming every missing one', () => {
		const { page, clustering } = clusteredPage(snapshot, MEASUREMENTS)
		const known = clustering.clusters[0].id

		const info = getClusterInfo(
			page,
			clustering,
			['cluster:gone', known, 'cluster:also-gone'],
			FIRST_PAGE
		)

		expect(info.ok).toBe(false)
		if (info.ok) return
		expect(info.reason).toBe('cluster_not_found')
		expect(textOf(info.result)).toBe(
			'No cluster on page 0 with id "cluster:gone", "cluster:also-gone". Call get_page_info to list this page\'s clusters.'
		)
	})

	describe('the shape cap', () => {
		// A frame holding CLUSTER_INFO_MAX_SHAPES boxes, so its cluster is one over the cap on its own,
		// and a lone box beside it.
		const { snapshot: bigSnapshot, measurements: bigMeasurements } = farApart([
			shape('shape:big', { type: 'frame', props: { w: 2000, h: 100, name: 'Big' } }),
			...Array.from({ length: CLUSTER_INFO_MAX_SHAPES }, (_, i) =>
				shape(`shape:box-${i}`, { parentId: 'shape:big', props: { w: 10, h: 10 } })
			),
			shape('shape:lone', { x: 100_000 }),
		])

		it('refuses several clusters that hold more shapes than one call returns', () => {
			const { page, clustering } = clusteredPage(bigSnapshot, bigMeasurements)
			const ids = [clusterIdOf(clustering, 'shape:lone'), clusterIdOf(clustering, 'shape:big')]

			const info = getClusterInfo(page, clustering, ids, FIRST_PAGE)

			expect(info.ok).toBe(false)
			if (info.ok) return
			expect(info.reason).toBe('too_many_shapes')
			expect(textOf(info.result)).toBe(
				`Those 2 clusters hold ${CLUSTER_INFO_MAX_SHAPES + 2} shapes, more than the ${CLUSTER_INFO_MAX_SHAPES} one call returns across several clusters. Ask for fewer clusters at a time: get_page_info gives each cluster's numberOfShapes. A cluster larger than that can still be asked for on its own.`
			)
		})

		// Nothing smaller could be asked for, so refusing it would leave the cluster unreadable.
		it('still answers a single cluster that is over the cap on its own', () => {
			const { page, clustering } = clusteredPage(bigSnapshot, bigMeasurements)

			const info = getClusterInfo(
				page,
				clustering,
				[clusterIdOf(clustering, 'shape:big')],
				FIRST_PAGE
			)

			expect(info.ok).toBe(true)
			if (!info.ok) return
			expect(JSON.parse(textOf(info.result)).clusters[0].numberOfShapes).toBe(
				CLUSTER_INFO_MAX_SHAPES + 1
			)
		})
	})

	// The stored arrow is a 2-unit stub at the origin; what a model needs is where it is drawn and
	// what it connects.
	it('reports a bound arrow as drawn, with what each end is bound to', () => {
		const bound = shapesOfCluster(MEASUREMENTS, 'shape:bound')('shape:bound')

		expect(bound.arrow).toEqual({
			fromId: 'shape:a',
			toId: 'shape:b',
			start: {
				x: 100,
				y: 50,
				binding: {
					normalizedAnchor: { x: 25, y: 33 },
					isPrecise: true,
					isExact: false,
					snap: 'none',
				},
			},
			end: {
				x: 400,
				y: 50,
				binding: {
					normalizedAnchor: { x: 25, y: 33 },
					isPrecise: true,
					isExact: false,
					snap: 'none',
				},
			},
			label: { x: 250, y: 50 },
		})
		// The stub is gone rather than left to contradict the resolved ends.
		expect(bound.props.start).toBeUndefined()
		expect(bound.props.end).toBeUndefined()
	})

	it('places every shape in page space, whatever its parent, and keeps the parent', () => {
		const of = shapesOfCluster(MEASUREMENTS, 'shape:inner')

		expect(of('shape:frame')).toMatchObject({
			pageX: 1000,
			pageY: 501,
			pageRotation: 90,
			pageBounds: { x: 700, y: 501, w: 300, h: 400 },
		})
		// (10, 20) inside a frame at (1000.4, 500.6) turned 90°: x runs down the page, y runs left.
		expect(of('shape:inner')).toMatchObject({
			parentId: 'shape:frame',
			pageX: 980,
			pageY: 511,
			pageRotation: 90,
			pageBounds: { x: 880, y: 511, w: 100, h: 100 },
		})
		expect(of('shape:inner').x).toBeUndefined()
		expect(of('shape:inner').rotation).toBeUndefined()
	})

	it('rounds every number, and reports fractions as percentages', () => {
		const of = shapesOfCluster(MEASUREMENTS, 'shape:free')

		expect(of('shape:inner').opacity).toBe(55)
		expect(of('shape:free').props).toMatchObject({
			bend: 12,
			labelPosition: 50,
			elbowMidPoint: 50,
			scale: 150,
		})
		expect(of('shape:frame').props).toEqual({ w: 400, h: 300, name: 'Flow' })
	})

	// A fixture, or a render page older than the worker, has no arrow geometry. A free end can still
	// be placed from the record; a bound one is reported by its binding alone.
	it('places a free arrow from its record when the render did not measure it', () => {
		const of = shapesOfCluster(MEASUREMENTS, 'shape:free')
		// The free arrow sits at (50, 0) in the frame, so its ends run down the page from there.
		expect(of('shape:free').arrow).toEqual({
			fromId: null,
			toId: null,
			start: { x: 1000, y: 551, binding: null },
			end: { x: 1000, y: 651, binding: null },
		})

		const { arrow: _arrow, ...unmeasured } = MEASUREMENTS['shape:bound']
		const bound = shapesOfCluster(
			{ ...MEASUREMENTS, 'shape:bound': unmeasured },
			'shape:bound'
		)('shape:bound')
		expect(bound.arrow.fromId).toBe('shape:a')
		expect(bound.arrow.start).not.toHaveProperty('x')
		expect(bound.arrow.label).toBeUndefined()
	})

	it('carries the text the editor reported and drops the rich text', () => {
		const of = shapesOfCluster(MEASUREMENTS, 'shape:a')
		expect(of('shape:a').props.text).toBe('Start')
		expect(of('shape:a').props.richText).toBeUndefined()
	})
})
