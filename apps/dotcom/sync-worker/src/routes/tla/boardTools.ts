import {
	ClusterBounds,
	ClusterMeasurement,
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_PAGES,
	MeasuredArrow,
	MeasuredDimensions,
	ShapeCluster,
	can,
	getShapeClusters,
	getShapeText,
	type TLShapeWithPlainText,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import {
	BoxModel,
	TLArrowBinding,
	TLShape,
	VecModel,
	b64Vecs,
	isBinding,
	isPage,
	isShape,
} from '@tldraw/tlschema'
import { getDocumentNameFromSnapshot } from '../getDocumentNameFromSnapshot'

// Everything about this MCP server that a model can perceive: the protocol handshake and its
// instructions, the tool names, titles and descriptions, how arguments are parsed and how bad ones
// are refused, how a page's shapes are grouped and labelled, what a shape record looks like once
// it's readable, and the wording of every error a model has to recover from.
//
// Deliberately pure. It takes a room snapshot and a table of shape measurements — data — and returns
// tool results. It knows nothing about Postgres, R2, Browser Rendering, rate limits, caching or
// telemetry; mcpServer.ts owns all of that and calls in here.
//
// The split is what makes this server evaluable. The private eval harness sends checked-in board
// fixtures to the local-only route in evalsLocalMcp.ts, which serves these exact functions. A run
// therefore exercises the real tool descriptions and error strings without a database, browser or
// rate limiter. Anything a model can read must live here, or an eval stops being evidence about the
// deployed server.

export const MCP_PROTOCOL_VERSION = '2025-11-25'

export const MCP_SERVER_INFO = {
	name: 'tldraw-boards',
	title: 'tldraw boards',
	version: '3.8.0',
}

/**
 * What the handshake tells a model this server is for.
 *
 * Two versions, because `initialize` is read before any tool is called: told to "find a board by
 * name" on a deployment that cannot, a model calls the listing tool and reads whatever comes back as
 * matches. That is the same failure the tool definition already guards against, arriving one step
 * earlier — see `getSearchBoardsToolDefinition`.
 */
export function getMcpServerInstructions(nameMatchingEnabled: boolean) {
	return nameMatchingEnabled ? SEARCHING_INSTRUCTIONS : LISTING_INSTRUCTIONS
}

const SEARCHING_INSTRUCTIONS =
	'MCP server for tldraw.com boards you have access to. Start with search_boards to find a board by name, or to list your newest boards, when you do not already have a board id. Then drill down: get_board_info lists a board’s pages, get_page_info lists one page’s clusters (shapes grouped by nearness, containment and the arrows between them) with where each sits on the page, and get_cluster_screenshot returns a PNG of one or more clusters. get_cluster_info describes the shapes inside one or more clusters when those matter. list_workspaces lists the workspaces you belong to, create_board makes a new, empty board in your personal workspace or in a workspace you name, and rename_board changes a board’s name. get_page_info, get_cluster_info and get_cluster_screenshot work through the user’s own browser tab, so the board has to be open at tldraw.com/f/:slug: if it is not, they say so, and you should ask the user to open it. search_boards covers your own boards, your workspaces’ boards, and boards shared with you by link that you have opened.'

const LISTING_INSTRUCTIONS =
	'MCP server for tldraw.com boards you have access to. Start with search_boards to list the boards you can reach, when you do not already have a board id. It lists them in the order they reached you and takes no query: searching by name is not available on this deployment, so a board cannot be found by its title here. Then drill down: get_board_info lists a board’s pages, get_page_info lists one page’s clusters (shapes grouped by nearness, containment and the arrows between them) with where each sits on the page, and get_cluster_screenshot returns a PNG of one or more clusters. get_cluster_info describes the shapes inside one or more clusters when those matter. list_workspaces lists the workspaces you belong to, create_board makes a new, empty board in your personal workspace or in a workspace you name, and rename_board changes a board’s name. get_page_info, get_cluster_info and get_cluster_screenshot work through the user’s own browser tab, so the board has to be open at tldraw.com/f/:slug: if it is not, they say so, and you should ask the user to open it. search_boards lists your own boards, your workspaces’ boards, and boards shared with you by link that you have opened. Because it cannot match on names, page through the list rather than expecting a title to narrow it.'

export const SEARCH_BOARDS_TOOL_NAME = 'search_boards'
export const BOARD_INFO_TOOL_NAME = 'get_board_info'
export const PAGE_INFO_TOOL_NAME = 'get_page_info'
export const CLUSTER_INFO_TOOL_NAME = 'get_cluster_info'
export const CLUSTER_SCREENSHOT_TOOL_NAME = 'get_cluster_screenshot'
export const CREATE_BOARD_TOOL_NAME = 'create_board'
export const RENAME_BOARD_TOOL_NAME = 'rename_board'
export const LIST_WORKSPACES_TOOL_NAME = 'list_workspaces'

export const TOOL_NAMES = [
	SEARCH_BOARDS_TOOL_NAME,
	LIST_WORKSPACES_TOOL_NAME,
	CREATE_BOARD_TOOL_NAME,
	RENAME_BOARD_TOOL_NAME,
	BOARD_INFO_TOOL_NAME,
	PAGE_INFO_TOOL_NAME,
	CLUSTER_INFO_TOOL_NAME,
	CLUSTER_SCREENSHOT_TOOL_NAME,
] as const

// What a model is told when the board id it was given leads nowhere. The route decides *whether* a
// board is missing or empty — that needs Postgres and R2 — but the wording lives here with the rest
// of the model-facing surface, so a harness serving fixtures refuses an unknown id identically.
//
// One message for every way a board can fail to resolve, deliberately silent on which: a board id is
// something the caller types, so an error that told "this exists but is not yours" apart from "this
// does not exist" would let anyone test file ids for existence. It also cannot name what would fix
// it, since the caller may simply be signed in as the wrong account.
export const BOARD_NOT_FOUND_MESSAGE =
	'No board was found with this id, or this account does not have access to it. Boards in your own workspace, boards owned by a workspace you belong to, boards shared with you via link, and published boards are supported.'
// BOARD_NOT_FOUND_MESSAGE ends by inviting published boards, which a rename cannot take: a /p/ slug
// names a published copy, not the file. Still one message for missing and inaccessible alike.
export const RENAME_BOARD_NOT_FOUND_MESSAGE =
	'No board was found with this id, or this account does not have access to it. Pass the id from the board’s tldraw.com/f/ URL or from search_boards; a published tldraw.com/p/ board cannot be renamed.'

// Only a board the caller can already see gets this: one shared with them by link, which they may
// open and edit but whose name belongs to the workspace that owns it.
export const RENAME_BOARD_FORBIDDEN_MESSAGE =
	'This board is shared with you by link, but only members of the workspace that owns it can rename it.'
export const BOARD_EMPTY_MESSAGE = 'This board has no saved content yet.'

// --- Reading a snapshot -------------------------------------------------------------------------

/**
 * What an editor reports for one shape: what clustering reads (its page bounds and, for an arrow,
 * where the editor drew it), plus the text its ShapeUtil reported and, for a text, group, draw or
 * highlight shape, its size as drawn.
 */
export interface ShapeMeasurement extends ClusterMeasurement {
	text?: string
	dimensions?: MeasuredDimensions
}

// A board page in stable board order. `index` is the 0-based ordinal callers pass to the screenshot
// tool; `id` is the internal TLPageId used to drive the render page.
export interface EnumeratedPage {
	index: number
	id: string
	name: string
	hasContent: boolean
}

// Lists a board's pages in the same order the editor shows them. tldraw page indexes are fractional
// indexes that sort lexicographically, so a plain string sort matches the editor's ordering. A page
// "has content" when at least one shape sits directly on it (nested shapes always have a top-level
// ancestor on their page, so checking direct children is sufficient).
export function enumerateBoardPages(snapshot: RoomSnapshot): EnumeratedPage[] {
	const records = snapshot.documents.map((d) => d.state)
	const pageRecords = records.filter(isPage)
	pageRecords.sort((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0))
	const parentIdsWithShapes = new Set(records.filter(isShape).map((s) => s.parentId))
	return pageRecords.slice(0, MAX_THUMBNAIL_PAGES).map((p, index) => ({
		index,
		id: String(p.id),
		name: typeof p.name === 'string' && p.name.length > 0 ? p.name : `Page ${index + 1}`,
		hasContent: parentIdsWithShapes.has(p.id),
	}))
}

// The shapes belonging to one page, in snapshot order. Nested shapes carry their ancestor's id as
// `parentId`, so membership is resolved by walking up to a top-level shape whose parent is the page.
export function getShapesOnPage(snapshot: RoomSnapshot, pageId: string): TLShape[] {
	const shapes = snapshot.documents.map((d) => d.state).filter(isShape)
	const byId = new Map(shapes.map((s) => [s.id, s]))
	return shapes.filter((shape) => {
		let current: TLShape | undefined = shape
		// Bounded by the ancestor chain, and guarded against a cyclic parentId in a corrupt snapshot.
		for (let depth = 0; current && depth < 100; depth++) {
			if (current.parentId === pageId) return true
			current = byId.get(current.parentId as TLShape['id'])
		}
		return false
	})
}

// --- Input parsing ------------------------------------------------------------------------------

// One page of search results. Fixed rather than caller-settable: the cursor is how a caller reaches
// more, and a page size that varies per call would have to be carried inside the cursor for the next
// page to mean anything.
export const BOARD_SEARCH_PAGE_SIZE = 20
export const BOARD_SEARCH_MAX_QUERY_LENGTH = 200
export const BOARD_SEARCH_MAX_TERMS = 8

/**
 * Where a page of search results ended: the sort key of its last row.
 *
 * Both halves are needed. `arrivedAt` is not unique — boards created in one batch share one — so
 * `id` is the tiebreaker that makes "where the page ended" a single point rather than a range.
 */
export interface BoardSearchCursor {
	/**
	 * When the board entered this caller's list: created in one of their workspaces, moved into one,
	 * or opened by them through a share link. Immutable whichever way it arrived, which is what a
	 * keyset cursor needs; `searchBoards.ts` says why, and reads it from a different column per case.
	 */
	arrivedAt: number
	id: string
}

// search_boards is the only tool with `required: []` — the other four all mandate boardId, which is
// why `arguments` being wire-optional never mattered before. Its own description tells a model to
// omit the query to list its newest boards, so a call with no `arguments` key at all is a legitimate
// "list my newest boards", not a malformed one, and must not hit `requireArgumentsObject(undefined)`.
export function parseSearchBoardsInput(
	input: unknown,
	nameMatchingEnabled = true
): {
	terms: string[]
	cursor: BoardSearchCursor | null
} {
	const value = requireArgumentsObject(input ?? {})
	const terms = parseSearchTerms(value.query)
	// Refused, never quietly dropped. A model that asked for "roadmap" and got this account's twenty
	// most recent boards would read them as twenty matches and act on one — worse than being told the
	// search is unavailable, which it can recover from by listing instead.
	if (terms.length && !nameMatchingEnabled) {
		throw new Error(
			'Searching by name is not available on this deployment. Omit the query to list boards instead.'
		)
	}
	return { terms, cursor: parseBoardSearchCursor(value.cursor, terms) }
}

// Terms are ANDed, so "design system" finds "System design v2" whatever the order they were typed
// in. A query of only whitespace means the same as no query: list the caller's newest boards.
function parseSearchTerms(value: unknown): string[] {
	if (value === undefined || value === null) return []
	if (typeof value !== 'string') {
		throw new Error('query must be a string')
	}
	if (value.length > BOARD_SEARCH_MAX_QUERY_LENGTH) {
		throw new Error(`query must be ${BOARD_SEARCH_MAX_QUERY_LENGTH} characters or fewer`)
	}
	const terms = value.split(/\s+/).filter((term) => term.length > 0)
	// Each term becomes its own ILIKE, unindexable, over a scan that is already unbounded (see
	// searchBoards.ts) — a query length limit alone does not bound term count, since whitespace is
	// cheap. Thrown rather than truncated: silently dropping terms would change what was searched for
	// without telling the caller.
	if (terms.length > BOARD_SEARCH_MAX_TERMS) {
		throw new Error(`query must be ${BOARD_SEARCH_MAX_TERMS} words or fewer`)
	}
	return terms
}

/**
 * Reads back a cursor this server issued.
 *
 * Refuses anything it cannot decode rather than falling back to the first page: a model that has
 * paged three times and is silently returned to the start sees its own last page repeating, with no
 * signal that its cursor was the problem.
 */
function parseBoardSearchCursor(value: unknown, terms: string[]): BoardSearchCursor | null {
	if (value === undefined || value === null) return null
	if (typeof value !== 'string') {
		throw new Error('cursor must be a string: the nextCursor from a previous search_boards result')
	}
	const invalid = new Error(
		'cursor is not valid. Omit it to start from the first page, or pass the nextCursor from a previous search_boards result.'
	)
	let decoded: string
	try {
		decoded = atob(value)
	} catch {
		throw invalid
	}
	// The encoder percent-escapes both the id and the query, and percent-escaping covers the colon,
	// so these are the only three unescaped ones.
	const parts = decoded.split(':')
	if (parts.length !== 3) throw invalid
	const [timestampPart, idPart, queryPart] = parts
	// `Number()` accepts far more than a timestamp can legitimately be: '' -> 0, '1e3' -> 1000,
	// ' 5' -> 5, '+5' -> 5, 'Infinity' -> Infinity. Requiring plain digits first catches all of
	// these, including the empty-prefix forgery `btoa(":id")`, which would otherwise pass
	// `Number.isSafeInteger(0) && 0 >= 0` and seek strictly below epoch — an empty page with no
	// nextCursor, forever, and no signal that the cursor was the problem. `encodeBoardSearchCursor`
	// only ever writes a non-negative safe integer's `toString()`, which is always plain digits, so
	// this cannot reject a cursor this server minted.
	if (!/^\d+$/.test(timestampPart)) throw invalid
	const arrivedAt = Number(timestampPart)
	let id: string
	let query: string
	try {
		id = decodeURIComponent(idPart)
		query = decodeURIComponent(queryPart)
	} catch {
		throw invalid
	}
	// A cursor is a position in one query's results and means nothing in another's. Without this a
	// model that pages, then narrows its query while passing the cursor on, silently continues from
	// row 20 of a set it never saw the start of — and has no way to tell that is what happened.
	if (query !== normalizeSearchQuery(terms)) {
		throw new Error(
			'cursor is from a different query. Repeat the query it came from, or omit the cursor to start this one from its first page.'
		)
	}
	// `Number.isSafeInteger`, not `Number.isInteger`: an all-digit timestamp past MAX_SAFE_INTEGER
	// passes the check above, then binds as an out-of-range int8 and makes Postgres throw, so caller
	// garbage would reach a model as "the board database could not be reached" rather than as a bad
	// cursor. An empty id is refused here too: it would seek on `arrivedAt` alone, re-serving or
	// skipping every board that shares it.
	if (!Number.isSafeInteger(arrivedAt) || id.length === 0) throw invalid
	return { arrivedAt, id }
}

// Opaque on purpose: a model should only ever hand back a cursor it was given, which leaves the
// encoding free to change without every client having to.
//
// The id and the query are percent-escaped because `btoa` throws on anything outside Latin-1 and
// this runs inside the route's `try`, so anything it choked on would be reported as a database
// failure. Real file ids are URL-safe ASCII, which percent-encoding leaves byte for byte; fixture
// ids and search terms are arbitrary strings — a query in any non-Latin script would otherwise
// throw here — and this is what keeps them round-tripping.
function encodeBoardSearchCursor(cursor: BoardSearchCursor, terms: string[]): string {
	return btoa(
		`${cursor.arrivedAt}:${encodeURIComponent(cursor.id)}:${encodeURIComponent(normalizeSearchQuery(terms))}`
	)
}

// What makes two searches "the same query" for the purposes of continuing a cursor. Lowercased
// because the matching is `ilike`, so case never changed which boards the cursor was pointing into;
// joined on single spaces because `parseSearchTerms` has already split the caller's whitespace away.
function normalizeSearchQuery(terms: string[]): string {
	return terms.map((term) => term.toLowerCase()).join(' ')
}

export function parseBoardInfoInput(input: unknown): { boardId: string } {
	const value = requireArgumentsObject(input)
	return { boardId: parseBoardId(value.boardId) }
}

export function parsePageInfoInput(input: unknown): {
	boardId: string
	page: PageSelector
	cursor: number | null
} {
	const value = requireArgumentsObject(input)
	const page = parsePageSelector(value.page)
	return {
		boardId: parseBoardId(value.boardId),
		page,
		cursor: parsePageInfoCursor(value.cursor, page),
	}
}

// Refused rather than read as the first page, for the reason search_boards gives. The cursor is an
// offset into one page's clusters, and means nothing on another.
function parsePageInfoCursor(value: unknown, page: PageSelector): number | null {
	if (value === undefined || value === null) return null
	const invalid = new Error(
		'cursor is not valid. Omit it to start from the first cluster, or pass the nextCursor from a previous get_page_info result.'
	)
	if (typeof value !== 'string') throw invalid
	let parts: string[]
	try {
		parts = atob(value).split(':')
	} catch {
		throw invalid
	}
	if (parts.length !== 2 || !/^\d+$/.test(parts[0])) throw invalid
	let selector: string
	try {
		selector = decodeURIComponent(parts[1])
	} catch {
		throw invalid
	}
	if (selector !== JSON.stringify(page)) {
		throw new Error(
			'cursor is from a different page. Repeat the page it came from, or omit the cursor to start from the first cluster.'
		)
	}
	return Number(parts[0])
}

// Opaque, so the encoding can change without clients having to. The selector is percent-escaped
// because a page id can hold a `:`, and `btoa` throws outside Latin-1.
export function encodePageInfoCursor(offset: number, page: PageSelector): string {
	return btoa(`${offset}:${encodeURIComponent(JSON.stringify(page))}`)
}

// Bounds the request itself. Paging bounds the answer.
export const CLUSTER_INFO_MAX_IDS = 100

/** Where a paged get_cluster_info answer picks up: a shape within one of the clusters asked for. */
export interface ClusterInfoCursor {
	cluster: number
	shape: number
}

export function parseClusterInfoInput(input: unknown): {
	boardId: string
	page: PageSelector
	clusterIds: string[]
	cursor: ClusterInfoCursor | null
} {
	const value = requireArgumentsObject(input)
	// `clusterId` is the argument this tool took before it took several. A client holding the old tool
	// list still sends it.
	const clusterIds = [...new Set(parseClusterIds(value.clusterIds ?? value.clusterId))]
	if (clusterIds.length > CLUSTER_INFO_MAX_IDS) {
		throw new Error(
			`clusterIds takes at most ${CLUSTER_INFO_MAX_IDS} ids in one call. Split them across several calls.`
		)
	}
	return {
		boardId: parseBoardId(value.boardId),
		page: parsePageSelector(value.page),
		clusterIds,
		cursor: parseClusterInfoCursor(value.cursor, clusterIds),
	}
}

// Refused rather than read as the first page, for the reason search_boards gives: a model whose
// cursor silently restarts sees its own answers repeat, with no sign the cursor was the problem.
function parseClusterInfoCursor(value: unknown, clusterIds: string[]): ClusterInfoCursor | null {
	if (value === undefined || value === null) return null
	const invalid = new Error(
		'cursor is not valid. Omit it to start from the first shape, or pass the nextCursor from a previous get_cluster_info result.'
	)
	if (typeof value !== 'string') throw invalid
	let parts: string[]
	try {
		parts = atob(value).split(':')
	} catch {
		throw invalid
	}
	if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) throw invalid
	// A cursor is a position in one list of clusters. Passed on with a different list it would point
	// into clusters the caller never saw the start of.
	let ids: string
	try {
		ids = decodeURIComponent(parts[2])
	} catch {
		throw invalid
	}
	if (ids !== clusterIds.join(',')) {
		throw new Error(
			'cursor is from a different set of clusterIds. Repeat the clusterIds it came from, or omit the cursor to start from the first shape.'
		)
	}
	return { cluster: Number(parts[0]), shape: Number(parts[1]) }
}

// Opaque, so the encoding can change without clients having to. The ids are percent-escaped because
// `btoa` throws outside Latin-1.
function encodeClusterInfoCursor(cursor: ClusterInfoCursor, clusterIds: string[]): string {
	return btoa(`${cursor.cluster}:${cursor.shape}:${encodeURIComponent(clusterIds.join(','))}`)
}

export function parseClusterScreenshotInput(input: unknown): {
	boardId: string
	page: PageSelector
	clusterIds: string[]
	theme: 'light' | 'dark'
} {
	const value = requireArgumentsObject(input)
	return {
		boardId: parseBoardId(value.boardId),
		page: parsePageSelector(value.page),
		clusterIds: parseClusterIds(value.clusterIds),
		theme: parseTheme(value.theme),
	}
}

export const BOARD_NAME_MAX_LENGTH = 200

// A null workspace means the caller's personal workspace. A blank string is treated the same way
// rather than as a name to match: a model that fills every field in the schema sends "" for the one
// it meant to leave out.
export function parseCreateBoardInput(input: unknown): { name: string; workspace: string | null } {
	const value = requireArgumentsObject(input)
	const name = parseBoardName(value.name, 'the title for the new board')
	if (value.workspace !== undefined && value.workspace !== null) {
		if (typeof value.workspace !== 'string') {
			throw new Error('workspace must be a workspace name or id')
		}
	}
	const workspace = typeof value.workspace === 'string' ? value.workspace.trim() : ''
	return { name, workspace: workspace || null }
}

// Takes no arguments. A call with no `arguments` key at all is the normal way to call it, so undefined
// is accepted the way parseSearchBoardsInput accepts it.
export function parseListWorkspacesInput(input: unknown): void {
	requireArgumentsObject(input ?? {})
}

export function parseRenameBoardInput(input: unknown): { boardId: string; name: string } {
	const value = requireArgumentsObject(input)
	return {
		boardId: parseBoardId(value.boardId),
		name: parseBoardName(value.name, 'the new title for the board'),
	}
}

function parseBoardName(value: unknown, purpose: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`name is required: ${purpose}`)
	}
	const name = value.trim()
	if (name.length > BOARD_NAME_MAX_LENGTH) {
		throw new Error(`name must be at most ${BOARD_NAME_MAX_LENGTH} characters`)
	}
	return name
}

// Accepts one id or several. A single string is allowed because asking for one cluster is the common
// case and making callers wrap it in an array is friction for nothing.
export function parseClusterIds(value: unknown): string[] {
	const ids = typeof value === 'string' ? [value] : value
	if (!Array.isArray(ids) || ids.length === 0) {
		throw new Error('clusterIds is required: a cluster id, or an array of them')
	}
	if (!ids.every((id): id is string => typeof id === 'string' && id.length > 0)) {
		throw new Error('clusterIds must each be a cluster id from get_page_info')
	}
	return ids
}

function requireArgumentsObject(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== 'object') {
		throw new Error('Tool arguments must be an object')
	}
	return input as Record<string, unknown>
}

function parseBoardId(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error('boardId is required')
	}
	if (value.includes('/')) {
		throw new Error('boardId must be a board id, not a URL')
	}
	return value
}

// Omitting the theme means light, but an unrecognized one is rejected rather than quietly treated
// as light: a caller asking for `blue` gets a wrong-but-plausible image back and no signal that the
// argument was ignored.
function parseTheme(value: unknown): 'light' | 'dark' {
	if (value === undefined || value === null) return 'light'
	if (value !== 'light' && value !== 'dark') {
		throw new Error(`theme must be 'light' or 'dark'`)
	}
	return value
}

// A page is named either by its 0-based ordinal or by its id. Ordinals read naturally but shift the
// moment pages are reordered, so an id a caller is holding from an earlier call keeps pointing at the
// same page. Both are accepted in the one argument so the tool surface stays small.
export type PageSelector = { kind: 'ordinal'; ordinal: number } | { kind: 'id'; id: string }

function parsePageSelector(value: unknown): PageSelector {
	if (value === undefined || value === null) return { kind: 'ordinal', ordinal: 0 }
	if (typeof value === 'string') {
		if (!value.startsWith('page:')) {
			throw new Error(
				'page must be a 0-based page ordinal (a number) or a page id (the "page:…" string from get_board_info)'
			)
		}
		return { kind: 'id', id: value }
	}
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		throw new Error('page must be a non-negative integer (0-based page ordinal) or a page id')
	}
	return { kind: 'ordinal', ordinal: value }
}

/** How the page was named, for error messages that echo back what the caller actually passed. */
export function describePageSelector(selector: PageSelector) {
	return selector.kind === 'id' ? `"${selector.id}"` : String(selector.ordinal)
}

// --- Tool results -------------------------------------------------------------------------------

export interface ToolResult {
	content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>
	isError?: boolean
}

export function toolError(message: string): ToolResult {
	return {
		content: [{ type: 'text', text: message }],
		isError: true,
	}
}

export function toolPageResult(name: string, base64: string): ToolResult {
	return {
		content: [
			{ type: 'text', text: name },
			{ type: 'image', data: base64, mimeType: 'image/png' },
		],
	}
}

export function toolJsonResult(value: unknown): ToolResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(value) }],
	}
}

// --- The tools ----------------------------------------------------------------------------------

/** One board as the search query returns it, before it is shaped for the model. */
export interface BoardSearchRow extends BoardSearchCursor {
	name: string
	/** When the board itself was made. Reported to the model, but never the sort key — see `arrivedAt`. */
	createdAt: number
	/** When the board's row last changed, by anyone — not per-caller, and not the sort key. */
	updatedAt: number
	/**
	 * The name of the workspace that owns the board. Only reported for `workspace` boards — see
	 * `getBoardSearchResults`.
	 */
	workspaceName: string
	/**
	 * How the caller reaches this board, which is also which read found it.
	 *
	 * `shared` is not a flavour of `workspace`: the caller is not a member of the workspace that owns
	 * a link-shared board, so reporting it as one would tell a model it has standing there that it
	 * does not have — and would put another organisation's workspace name in front of somebody who
	 * was only ever given a link.
	 */
	source: 'owned' | 'workspace' | 'shared'
}

/**
 * The order search results come back in: most recently arrived board first, `id` descending to break
 * the ties `arrivedAt` leaves.
 *
 * "Arrived", not "created", so a board somebody shared with you this morning leads the list rather
 * than sorting by when its owner happened to make it — which for a long-lived board buries it under
 * everything you have made since.
 *
 * The single statement of that rule. `searchBoards.ts` mirrors it in SQL because Postgres does the
 * real ordering, and the eval harness pages through fixtures with this one — if the two disagree,
 * the harness stops being evidence about the deployed server. Ids compare by UTF-16 code unit here,
 * which is why the SQL declares `COLLATE "C"`: an ICU or glibc collation orders the mixed case, `_`
 * and `-` of a tldraw id differently, and the two mirrors would silently part company.
 */
export function compareBoardSearchOrder(a: BoardSearchCursor, b: BoardSearchCursor): number {
	if (a.arrivedAt !== b.arrivedAt) return b.arrivedAt - a.arrivedAt
	return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}

/**
 * Whether a row belongs on a page after the one the cursor ended.
 *
 * Descending order means "after the cursor" is "sorts lower than the cursor", and the cursor's own
 * row is excluded — reverse either and a caller is served the page it just read, forever.
 */
export function isAfterBoardSearchCursor(
	row: BoardSearchCursor,
	cursor: BoardSearchCursor
): boolean {
	return compareBoardSearchOrder(row, cursor) > 0
}

/**
 * One page of search results.
 *
 * Takes one row more than a page and reports the surplus as `nextCursor` rather than returning it —
 * that is what lets the query answer "there is another page" without a second count. `nextCursor` is
 * absent on the last page, so a caller never fetches an empty page to discover it had finished.
 *
 * An empty result is a normal result, never `isError`: a model treats `isError` as a failure to
 * recover from and will retry a search that simply matched nothing.
 */
export function getBoardSearchResults(rows: BoardSearchRow[], terms: string[]): ToolResult {
	const boards = rows.slice(0, BOARD_SEARCH_PAGE_SIZE)
	const lastBoard = boards.at(-1)
	const hasMore = rows.length > boards.length
	return toolJsonResult({
		boardCount: boards.length,
		...(hasMore && lastBoard ? { nextCursor: encodeBoardSearchCursor(lastBoard, terms) } : {}),
		boards: boards.map((row) => ({
			boardId: row.id,
			name: getReportedBoardName(row.name),
			// The key the results are sorted by, so a model can see the order rather than guess at it.
			// Equal to createdAt for a board this account made, and later for one it was shared.
			addedAt: new Date(row.arrivedAt).toISOString(),
			createdAt: new Date(row.createdAt).toISOString(),
			updatedAt: new Date(row.updatedAt).toISOString(),
			source: row.source,
			// Only where it identifies something the caller can act on. On their own board the
			// workspace adds nothing `source: 'owned'` has not already said, so it would be noise on
			// every row — the cost being that a caller who renamed their home workspace
			// (`036_home_group_renameable.sql` made it renameable, "My workspace" being only the
			// default) will not see that name here. On a link-shared board it is withheld for a
			// different reason: it names a workspace the caller is not in, to someone who was given a
			// link rather than a seat.
			...(row.source === 'workspace' ? { workspaceName: row.workspaceName } : {}),
		})),
	})
}

// tldraw.com stores its creation-time default ("Wed 5:38 PM") on a board nobody named, so '' only
// survives on boards older than that default. Those stay blank rather than get a stand-in title:
// tldraw.com titles them in the viewer's locale and timezone, which the worker has neither of, and
// no query could match one.
export function getReportedBoardName(name: string | null | undefined): string {
	return name?.trim() ?? ''
}

// `fileName` is the board's `file` row name, the one search_boards reports. It is null for a board
// served as its published copy, whose snapshot holds the name it was published under (what its
// viewers see), and for an eval fixture, which has no row. The snapshot's `document` record is no
// substitute for a file board: the room copies the row's name onto it only when the row is
// updated (renamed, shared, published, moved), so it stays empty until then.
export function getBoardInfo(snapshot: RoomSnapshot, fileName: string | null): ToolResult {
	const pages = enumerateBoardPages(snapshot)
	return toolJsonResult({
		name: getReportedBoardName(fileName ?? getDocumentNameFromSnapshot(snapshot)),
		pageCount: pages.length,
		// `id` is the stable handle: it survives page reordering, `index` does not. Either can be
		// passed as `page` to the other tools.
		pages: pages.map((p) => ({
			index: p.index,
			id: p.id,
			name: p.name,
			hasContent: p.hasContent,
		})),
	})
}

/** A workspace the caller belongs to, and their role in it, as `listWorkspaces.ts` reads it. */
export interface WorkspaceMembershipRow {
	id: string
	name: string
	role: string
}

/**
 * Every workspace the caller belongs to, personal first and then by name. A role the roles table
 * does not know grants nothing, so its workspace is left out, the way search_boards leaves it out.
 */
export function getWorkspaceListResult(rows: WorkspaceMembershipRow[], userId: string): ToolResult {
	const workspaces = rows
		.filter((row) => can(row.role, 'accessFiles'))
		.map((row) => ({
			id: row.id,
			name: row.name,
			personal: row.id === userId,
			role: row.role,
		}))
		.sort((a, b) => Number(b.personal) - Number(a.personal) || a.name.localeCompare(b.name))
	return toolJsonResult({ workspaceCount: workspaces.length, workspaces })
}

/** A workspace the caller may add boards to, as `createBoard.ts` reads it. */
export interface CreatableWorkspace {
	id: string
	name: string
	/** The caller's own home workspace, whose id is their user id. */
	personal: boolean
}

export type ResolvedCreateBoardWorkspace =
	| { ok: true; workspace: CreatableWorkspace }
	| { ok: false; reason: 'workspace_not_found' | 'workspace_ambiguous'; result: ToolResult }

/**
 * Picks the workspace a new board goes into. Omitted means the personal one. Otherwise an exact id
 * wins, then a case-insensitive name: search_boards reports only workspace *names*, so an id-only
 * argument would be one a model that has not called list_workspaces cannot fill.
 *
 * Only workspaces the caller can add boards to are candidates, so a workspace they can see but not
 * add to reads as not found, and the refusal lists the ones that would work.
 */
export function resolveCreateBoardWorkspace(
	workspaces: CreatableWorkspace[],
	requested: string | null
): ResolvedCreateBoardWorkspace {
	if (requested === null) {
		const personal = workspaces.find((w) => w.personal)
		if (personal) return { ok: true, workspace: personal }
		return {
			ok: false,
			reason: 'workspace_not_found',
			result: toolError(
				`Your personal workspace could not be found. ${describeCreatableWorkspaces(workspaces)}`
			),
		}
	}

	const byId = workspaces.find((w) => w.id === requested)
	if (byId) return { ok: true, workspace: byId }

	const wanted = requested.toLowerCase()
	const byName = workspaces.filter((w) => w.name.trim().toLowerCase() === wanted)
	if (byName.length === 1) return { ok: true, workspace: byName[0] }
	if (byName.length > 1) {
		return {
			ok: false,
			reason: 'workspace_ambiguous',
			result: toolError(
				`More than one of your workspaces is named "${requested}". Pass the id of the one you mean as workspace: ${byName.map(formatWorkspace).join(', ')}.`
			),
		}
	}
	return {
		ok: false,
		reason: 'workspace_not_found',
		result: toolError(
			`No workspace you can create boards in matches "${requested}". ${describeCreatableWorkspaces(workspaces)}`
		),
	}
}

function describeCreatableWorkspaces(workspaces: CreatableWorkspace[]) {
	if (!workspaces.length) return 'This account has no workspaces it can create boards in.'
	return `Workspaces you can create boards in: ${workspaces.map(formatWorkspace).join(', ')}. Pass one of these as workspace, or omit it to use your personal workspace.`
}

function formatWorkspace(workspace: CreatableWorkspace) {
	return `"${workspace.name}" (id: ${workspace.id}${workspace.personal ? ', personal' : ''})`
}

export function getWorkspaceFullMessage(workspace: CreatableWorkspace, maxBoards: number) {
	return `The workspace "${workspace.name}" already has the maximum of ${maxBoards} boards. Delete boards there or choose a different workspace.`
}

export function getWorkspaceGoneMessage(workspace: CreatableWorkspace) {
	return `The workspace "${workspace.name}" was deleted. Choose a different workspace, or omit workspace to use your personal one.`
}

export function getCreatedBoardResult({
	boardId,
	name,
	url,
	workspace,
}: {
	boardId: string
	name: string
	url: string
	workspace: CreatableWorkspace
}): ToolResult {
	return toolJsonResult({
		boardId,
		name,
		url,
		workspace: { id: workspace.id, name: workspace.name, personal: workspace.personal },
		nextStep: `This board has to be open in a browser tab before you can read it. Open ${url}, or ask the user to.`,
	})
}

// Every page-scoped tool needs the same steps before it can do anything: validate the page selector
// and pull that page's shapes. Returning the tool's own error shape on failure keeps the wording
// identical across tools.
//
// Separate from the tools below because the caller has to know the page id before it can measure the
// page, and measuring is what produces the `measurements` those tools need.
export type ResolvedPage =
	| {
			ok: true
			pageId: string
			pageName: string
			shapes: TLShape[]
			/**
			 * The arrow bindings of this page's arrows, as stored. They are records rather than
			 * geometry, so get_cluster_info reports them without a measure.
			 */
			bindings: TLArrowBinding[]
	  }
	| { ok: false; reason: 'no_pages' | 'page_out_of_range'; result: ToolResult }

export function resolvePage(snapshot: RoomSnapshot, page: PageSelector): ResolvedPage {
	const pages = enumerateBoardPages(snapshot)
	if (pages.length === 0) {
		return { ok: false, reason: 'no_pages', result: toolError('This board has no pages.') }
	}

	const targetPage = page.kind === 'id' ? pages.find((p) => p.id === page.id) : pages[page.ordinal]
	if (!targetPage) {
		return {
			ok: false,
			reason: 'page_out_of_range',
			result: toolError(
				page.kind === 'id'
					? `No page with id "${page.id}" on this board. Call get_board_info to list its pages; a page id is stable across reordering, an index is not.`
					: `Page ${page.ordinal} is out of range: this board has ${pages.length} page(s) (0–${pages.length - 1}). Call get_board_info to list them.`
			),
		}
	}
	const shapes = getShapesOnPage(snapshot, targetPage.id)
	return {
		ok: true,
		pageId: targetPage.id,
		pageName: targetPage.name,
		shapes,
		bindings: getArrowBindingsOf(snapshot, shapes),
	}
}

function getArrowBindingsOf(snapshot: RoomSnapshot, shapes: TLShape[]): TLArrowBinding[] {
	const shapeIds = new Set<string>(shapes.map((shape) => shape.id))
	return snapshot.documents
		.map((d) => d.state)
		.filter(
			(record): record is TLArrowBinding =>
				isBinding(record) && record.type === 'arrow' && shapeIds.has(record.fromId)
		)
}

export type ResolvedPageOk = Extract<ResolvedPage, { ok: true }>

// Clustering takes three of the things a measure answers: where each shape sits, where
// each arrow's ends are drawn, and what ShapeUtil.getText says a shape holds. Bounds and arrow ends
// drive the linkage, alongside the page's bindings; the text is attached to the shapes so labelling
// reads the editor's answer rather than re-deriving one from props.
export function clusterPage(page: ResolvedPageOk, measurements: Record<string, ShapeMeasurement>) {
	const shapes: TLShapeWithPlainText[] = page.shapes.map((shape) => {
		const text = measurements[shape.id as string]?.text
		return text ? { ...shape, plainText: text } : shape
	})

	return getShapeClusters(shapes, page.pageId, measurements, page.bindings)
}

/**
 * A page's clusters, each cluster's box by cluster id, and the geometry get_cluster_info describes
 * its shapes with, by shape id.
 */
export interface PageClustering {
	clusters: ShapeCluster[]
	bounds: Record<string, BoxModel>
	arrows: Record<string, MeasuredArrow>
	dimensions: Record<string, MeasuredDimensions>
}

export function clusteringFromMeasure(
	clusters: ShapeCluster[],
	measurements: Record<string, ShapeMeasurement>
): PageClustering {
	const bounds: Record<string, BoxModel> = {}
	for (const cluster of clusters) {
		const box = toClusterBox(cluster.shapes.map((shape) => measurements[shape.id]))
		if (box) bounds[cluster.id] = box
	}
	const arrows: Record<string, MeasuredArrow> = {}
	const dimensions: Record<string, MeasuredDimensions> = {}
	for (const [id, measurement] of Object.entries(measurements)) {
		if (measurement.arrow) arrows[id] = measurement.arrow
		if (measurement.dimensions) dimensions[id] = measurement.dimensions
	}
	return { clusters, bounds, arrows, dimensions }
}

/**
 * The box around some shapes, rounded the way get_page_info reports it, or null when none were
 * measured.
 */
function toClusterBox(boxes: (ClusterBounds | undefined)[]): BoxModel | null {
	let union: ClusterBounds | null = null
	for (const box of boxes) {
		if (!box) continue
		union = union
			? {
					minX: Math.min(union.minX, box.minX),
					minY: Math.min(union.minY, box.minY),
					maxX: Math.max(union.maxX, box.maxX),
					maxY: Math.max(union.maxY, box.maxY),
				}
			: box
	}
	if (!union) return null
	return {
		x: toThousandths(union.minX),
		y: toThousandths(union.minY),
		w: toThousandths(union.maxX - union.minX),
		h: toThousandths(union.maxY - union.minY),
	}
}

/**
 * The most cluster JSON one get_page_info answer carries before it stops and hands back a nextCursor.
 * This JSON is denser than get_cluster_info's, mostly digits and punctuation, so it gets a limit of
 * its own: a 59K-character answer overflowed the 25K tokens some clients cut a tool result off at.
 */
export const PAGE_INFO_MAX_CHARS = 40_000

function roundClusterBox(box: BoxModel | null): BoxModel | null {
	if (!box) return null
	return {
		x: Math.round(box.x),
		y: Math.round(box.y),
		w: Math.round(box.w),
		h: Math.round(box.h),
	}
}

export function getPageInfo(
	page: ResolvedPageOk,
	{ clusters, bounds }: PageClustering,
	{ selector, offset }: { selector: PageSelector; offset: number } = {
		selector: { kind: 'ordinal', ordinal: 0 },
		offset: 0,
	}
): ToolResult {
	// Bounds let a model see what is near what without opening every cluster. They are null rather
	// than invented for a cluster the tab could not measure.
	const pageBounds = toClusterBox(
		Object.values(bounds).map(({ x, y, w, h }) => ({ minX: x, minY: y, maxX: x + w, maxY: y + h }))
	)

	// Scoped to the requested page: get_cluster_info and get_cluster_screenshot both resolve cluster
	// ids against a single page, so listing every shape on the board here would hand out ids that
	// neither of them can look up.
	//
	// Largest first, so a model that stops after the first answer has seen a big board's main areas.
	const ordered = [...clusters].sort((a, b) => b.numberOfShapes - a.numberOfShapes)
	const answer: object[] = []
	let size = 0
	let next = offset
	for (; next < ordered.length; next++) {
		const c = ordered[next]
		const entry = {
			id: c.id,
			label: c.label,
			keywords: c.keywords,
			numberOfShapes: c.numberOfShapes,
			bounds: roundClusterBox(bounds[c.id] ?? null),
		}
		const entrySize = JSON.stringify(entry).length + 1 // the comma
		if (answer.length > 0 && size + entrySize > PAGE_INFO_MAX_CHARS) break
		answer.push(entry)
		size += entrySize
	}

	return toolJsonResult({
		name: page.pageName,
		bounds: roundClusterBox(pageBounds),
		clusterCount: clusters.length,
		clusters: answer,
		...(next < ordered.length ? { nextCursor: encodePageInfoCursor(next, selector) } : null),
	})
}

/**
 * The most JSON one get_cluster_info answer carries before it stops and hands back a nextCursor.
 * Some clients cut a tool result off at 25K tokens, and this JSON runs about 2.5 to 3 characters a
 * token, so 60K characters keeps an answer under that. Measured rather than counted in
 * shapes, because a shape's size is mostly its text: a box is ~400 characters, a note holding a
 * paragraph several times that.
 */
export const CLUSTER_INFO_MAX_CHARS = 60_000

export type ClusterInfoResult =
	| { ok: true; result: ToolResult }
	| { ok: false; reason: 'cluster_not_found' | 'invalid_input'; result: ToolResult }

export function getClusterInfo(
	page: ResolvedPageOk,
	{ clusters, arrows, dimensions }: PageClustering,
	clusterIds: string[],
	selector: PageSelector,
	cursor: ClusterInfoCursor | null = null
): ClusterInfoResult {
	const found = findClusters(clusters, clusterIds, selector)
	if (!found.ok) return { ok: false, reason: 'cluster_not_found', result: found.result }

	const start = cursor ?? { cluster: 0, shape: 0 }
	// The ids are checked against the cursor when it is read, and a cluster whose shapes changed has a
	// new id and is refused above, so this catches a cursor that was altered or made up.
	if (start.shape >= (found.clusters[start.cluster]?.shapes.length ?? 0)) {
		return {
			ok: false,
			reason: 'invalid_input',
			result: toolError(
				'cursor does not point into these clusters any more. Omit it to start from the first shape.'
			),
		}
	}

	const pageTransformOf = getPageTransformResolver(page.shapes)
	const bindingsByArrow = new Map<string, TLArrowBinding[]>()
	for (const binding of page.bindings) {
		const existing = bindingsByArrow.get(binding.fromId)
		if (existing) existing.push(binding)
		else bindingsByArrow.set(binding.fromId, [binding])
	}

	// Fills the answer shape by shape until the next would take it over budget. At least one shape
	// always goes in, so a single shape larger than the budget still gets read and paging moves on.
	// The budget covers the whole answer: across many small clusters, the label and keywords each
	// one carries come to nearly as much again as its shapes. Room is kept for the longest cursor.
	const answered: Record<string, unknown>[] = []
	const longestCursor = encodeClusterInfoCursor(
		{
			cluster: found.clusters.length,
			shape: Math.max(...found.clusters.map((cluster) => cluster.shapes.length)),
		},
		clusterIds
	)
	let size = JSON.stringify({
		pageName: page.pageName,
		clusters: [],
		nextCursor: longestCursor,
	}).length
	let shapeCount = 0
	let next: ClusterInfoCursor | null = null
	fill: for (let c = start.cluster; c < found.clusters.length; c++) {
		const cluster = found.clusters[c]
		const firstShape = c === start.cluster ? start.shape : 0
		const shapes: unknown[] = []
		for (let s = firstShape; s < cluster.shapes.length; s++) {
			const shape = cluster.shapes[s]
			const readable = toReadableShape(shape, {
				transform: pageTransformOf(shape),
				measuredArrow: arrows[shape.id],
				measuredDimensions: dimensions[shape.id],
				bindings: bindingsByArrow.get(shape.id) ?? [],
			})
			// A slice's own fields are paid for with its first shape, so a cluster left for the next
			// answer costs this one nothing.
			const envelope = shapes.length
				? 0
				: JSON.stringify(describeClusterSlice(cluster, firstShape, [])).length + 1
			const shapeSize = envelope + JSON.stringify(readable).length + 1
			if (shapeCount > 0 && size + shapeSize > CLUSTER_INFO_MAX_CHARS) {
				next = { cluster: c, shape: s }
				if (shapes.length) answered.push(describeClusterSlice(cluster, firstShape, shapes))
				break fill
			}
			size += shapeSize
			shapeCount++
			shapes.push(readable)
		}
		answered.push(describeClusterSlice(cluster, firstShape, shapes))
	}

	return {
		ok: true,
		result: toolJsonResult({
			pageName: page.pageName,
			clusters: answered,
			...(next ? { nextCursor: encodeClusterInfoCursor(next, clusterIds) } : null),
		}),
	}
}

// A cluster split across answers carries firstShapeIndex, so a model can tell a slice from a whole
// cluster without counting against numberOfShapes, which is always the cluster's total.
function describeClusterSlice(cluster: ShapeCluster, firstShape: number, shapes: unknown[]) {
	const whole = firstShape === 0 && shapes.length === cluster.shapes.length
	return {
		clusterId: cluster.id,
		label: cluster.label,
		keywords: cluster.keywords,
		numberOfShapes: cluster.numberOfShapes,
		...(whole ? null : { firstShapeIndex: firstShape }),
		shapes,
	}
}

// Unknown ids refuse the whole call rather than answering for the ones that resolved: a caller asking
// for three clusters and getting two has no way to notice.
function findClusters(
	clusters: ShapeCluster[],
	clusterIds: string[],
	selector: PageSelector
): { ok: true; clusters: ShapeCluster[] } | { ok: false; result: ToolResult } {
	const byId = new Map(clusters.map((cluster) => [cluster.id, cluster]))
	const missing = clusterIds.filter((id) => !byId.has(id))
	if (missing.length > 0) {
		return {
			ok: false,
			result: toolError(
				`No cluster on page ${describePageSelector(selector)} with id ${missing.map((id) => `"${id}"`).join(', ')}. Call get_page_info to list this page's clusters.`
			),
		}
	}
	return { ok: true, clusters: clusterIds.map((id) => byId.get(id)!) }
}

export type PickedShapes = { ok: true; shapeIds: string[] } | { ok: false; result: ToolResult }

/**
 * The shapes to draw for a `get_cluster_screenshot` call. Separate from the capture itself, which is
 * the route's job: this only says *which* shapes, from ids the model supplied.
 */
export function pickClusterShapes(
	clusters: ShapeCluster[],
	clusterIds: string[],
	selector: PageSelector
): PickedShapes {
	const found = findClusters(clusters, clusterIds, selector)
	if (!found.ok) return found

	// Several clusters render as one framed image of their union, which is the point of taking more
	// than one: seeing how they sit relative to each other.
	return {
		ok: true,
		shapeIds: [
			...new Set(found.clusters.flatMap((cluster) => cluster.shapes.map((shape) => shape.id))),
		],
	}
}

// The shape as a model can use it. Starting from the stored record:
//
// - Position is in page space. A stored x/y/rotation is relative to the shape's parent, so a shape in
//   a frame or group would otherwise read as sitting somewhere else entirely, with nothing to say so.
//   They are replaced by pageX/pageY/pageRotation; parentId stays, so the hierarchy is still visible.
// - An arrow's props.start/end are where the editor drew its ends, in page space, and
//   props.bindingFromId/bindingToId are the shapes they are bound to. Its pageX/pageY are its drawn
//   start, and it has no pageRotation: its ends already say which way it points. On a bound arrow the
//   record's origin and ends are a placeholder stub, often at the page origin, so none of them come
//   from the record — an unmeasured bound start leaves pageX/pageY null, like props.start.
// - props.w/h are the shape's size as drawn. A geo draws at w by h + growY, so growY is folded into
//   h and dropped rather than left for a model to add a second time. A text's height comes from
//   laying out its text, and a group or a freehand stroke has no size on its record, so those are
//   measured; without a measure they are whatever the record holds.
// - A draw or highlight shape's segments are replaced by props.pointCount. Decoded, the points of a
//   few handwritten words run to thousands of coordinates that still don't say what was drawn; a
//   screenshot does, so the tool description sends a model to get_cluster_screenshot instead.
// - `props.richText` — a ProseMirror document, deeply nested and unreadable — is replaced by the plain
//   string the editor's ShapeUtil.getText reported. A geo shape's label is not in `props` under any
//   key a Worker could find, so without the editor's answer that text is simply invisible.
// - typeName is dropped: every entry is a shape, so it is always "shape".
// - Every number is rounded to thousandths, in the record's own units — radians included, where
//   thousandths are still a fraction of a degree. `meta` is the app's own data and is left exactly as
//   stored.
function toReadableShape(
	shape: TLShapeWithPlainText,
	{
		transform,
		measuredArrow,
		measuredDimensions,
		bindings,
	}: {
		transform: PageTransform
		measuredArrow: MeasuredArrow | undefined
		measuredDimensions: MeasuredDimensions | undefined
		bindings: TLArrowBinding[]
	}
) {
	const {
		plainText,
		id,
		type,
		parentId,
		x: _x,
		y: _y,
		rotation: _rotation,
		opacity,
		props: storedProps,
		typeName: _typeName,
		...rest
	} = shape
	const props = { ...(storedProps as Record<string, unknown>) }
	delete props.richText
	const text = plainText ?? getShapeText(shape)
	if (text) props.text = text
	else delete props.text
	if (type === 'geo') {
		if (typeof props.growY === 'number' && typeof props.h === 'number') props.h += props.growY
		delete props.growY
	} else if (measuredDimensions) {
		Object.assign(props, measuredDimensions)
	}
	if (type === 'draw' || type === 'highlight') {
		props.pointCount = countSegmentPoints(props.segments)
		delete props.segments
	}

	const arrow =
		type === 'arrow'
			? getArrowProps(
					storedProps as { start?: VecModel; end?: VecModel },
					transform,
					measuredArrow,
					bindings
				)
			: null
	if (arrow) Object.assign(props, arrow)

	return {
		id,
		type,
		parentId,
		...(arrow
			? { pageX: arrow.start?.pageX ?? null, pageY: arrow.start?.pageY ?? null }
			: {
					pageX: toThousandths(transform.x),
					pageY: toThousandths(transform.y),
					pageRotation: toPageRotation(transform.rotation),
				}),
		...rest,
		opacity: toThousandths(opacity),
		props: roundProps(props),
	}
}

function getArrowProps(
	props: { start?: VecModel; end?: VecModel },
	transform: PageTransform,
	measured: MeasuredArrow | undefined,
	bindings: TLArrowBinding[]
) {
	const bindingOf = (which: 'start' | 'end') => bindings.find((b) => b.props.terminal === which)
	const terminal = (which: 'start' | 'end') => {
		// Without a measure — a fixture, or a render page older than this worker — a free end can still
		// be placed from the record, since that is all the editor does with it. A bound end cannot, nor
		// can an end stored before arrows had bindings, which has no x/y and would place at NaN.
		const stored = props[which]
		const point = measured
			? measured[which]
			: !bindingOf(which) && stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)
				? applyPageTransform(transform, stored)
				: null
		return point ? { pageX: toThousandths(point.x), pageY: toThousandths(point.y) } : null
	}
	return {
		start: terminal('start'),
		end: terminal('end'),
		bindingFromId: bindingOf('start')?.toId ?? null,
		bindingToId: bindingOf('end')?.toId ?? null,
	}
}

// A segment is either a base64 path (with no `dim`, a 3D one) or, on a record that predates paths,
// an array of points.
function countSegmentPoints(segments: unknown) {
	if (!Array.isArray(segments)) return 0
	let count = 0
	for (const segment of segments as { path?: unknown; points?: unknown; dim?: 2 | 3 }[]) {
		if (typeof segment?.path === 'string')
			count += b64Vecs.decodePoints(segment.path, segment.dim).length
		else if (Array.isArray(segment?.points)) count += segment.points.length
	}
	return count
}

function roundProps(value: unknown): unknown {
	if (typeof value === 'number') return toThousandths(value)
	if (Array.isArray(value)) return value.map(roundProps)
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, roundProps(item)]))
	}
	return value
}

function toThousandths(value: number) {
	return Math.round(value * 1000) / 1000
}

// Composed from parent and child, a page rotation can run past a full turn or below zero; reported
// in [0, 2π) like a record's, with a hair under a full turn reading as 0 rather than 6.283.
function toPageRotation(radians: number) {
	const turn = Math.PI * 2
	const rotation = toThousandths(((radians % turn) + turn) % turn)
	return rotation >= toThousandths(turn) ? 0 : rotation
}

interface PageTransform {
	x: number
	y: number
	rotation: number
}

function applyPageTransform(transform: PageTransform, point: VecModel): VecModel {
	const cos = Math.cos(transform.rotation)
	const sin = Math.sin(transform.rotation)
	return {
		x: transform.x + point.x * cos - point.y * sin,
		y: transform.y + point.x * sin + point.y * cos,
	}
}

/**
 * Page transforms composed from the records alone, the way `Editor.getShapePageTransform` composes
 * them: a shape's local transform is its x, y and rotation, applied inside its parent's. That needs
 * no editor, so it works for every shape whether or not it was measured.
 */
function getPageTransformResolver(shapes: TLShape[]) {
	const byId = new Map<string, TLShape>(shapes.map((shape) => [shape.id, shape]))
	const resolved = new Map<string, PageTransform>()
	const resolve = (shape: TLShape, depth: number): PageTransform => {
		const cached = resolved.get(shape.id)
		if (cached) return cached
		// Bounded, so a cyclic parentId in a corrupt snapshot ends at a shape treated as top-level.
		const parent = depth < 100 ? byId.get(shape.parentId) : undefined
		const parentTransform = parent && resolve(parent, depth + 1)
		const transform = parentTransform
			? {
					...applyPageTransform(parentTransform, shape),
					rotation: parentTransform.rotation + shape.rotation,
				}
			: { x: shape.x, y: shape.y, rotation: shape.rotation }
		resolved.set(shape.id, transform)
		return transform
	}
	return (shape: TLShape) => resolve(shape, 0)
}

// --- Tool definitions ---------------------------------------------------------------------------

/**
 * @param nameMatchingEnabled - Whether this deployment will match on board names. When it will not,
 *   `search_boards` advertises no `query` argument and says so, rather than offering a search that
 *   would be refused. Read from the environment by the route; this layer stays free of it.
 */
export function getToolDefinitions(nameMatchingEnabled: boolean) {
	return [
		getSearchBoardsToolDefinition(nameMatchingEnabled),
		getListWorkspacesToolDefinition(),
		getCreateBoardToolDefinition(),
		getRenameBoardToolDefinition(),
		getBoardInfoToolDefinition(),
		getPageInfoToolDefinition(),
		getClusterInfoToolDefinition(),
		getClusterScreenshotToolDefinition(),
	]
}

const FILE_BOARD_ID_PROPERTY = {
	type: 'string',
	description:
		'The id of a tldraw.com board: the :slug of a file URL (https://www.tldraw.com/f/:slug) you own or that was shared with you.',
}

// Said by each tool that works in the caller's tab, so a model reads it where it picks the tool.
const NEEDS_OPEN_TAB =
	'The board must be open in the user’s browser tab: if it is not, ask them to open it.'

const BOARD_ID_PROPERTY = {
	type: 'string',
	description:
		'The id of a tldraw.com board: the :slug of a file URL (https://www.tldraw.com/f/:slug) you own or that was shared with you, or of a published board URL (https://www.tldraw.com/p/:slug).',
}

const PAGE_PROPERTY = {
	type: ['number', 'string'],
	description: 'The page id or 0-based index from get_board_info. Defaults to 0, the first page.',
	default: 0,
}

const READ_ONLY_ANNOTATIONS = {
	readOnlyHint: true,
	idempotentHint: true,
	openWorldHint: false,
	destructiveHint: false,
}

/**
 * The same tool with name matching turned off: it lists, and takes no `query`.
 *
 * A separate definition rather than the other one with a sentence appended, because a `query` the
 * caller must not send has no business in the schema — a model handed the argument will use it, and
 * be refused. The scope, ordering and paging wording is the same, since none of that changes.
 */
function getListBoardsToolDefinition() {
	return {
		name: SEARCH_BOARDS_TOOL_NAME,
		title: 'List tldraw boards',
		description: `List tldraw.com boards this account can reach: the boards in its own workspace, the boards owned by the workspaces it belongs to, and the boards shared with it by link that it has opened. Searching by name is not available on this deployment, so this tool takes no query and lists boards in order instead. Results are ordered by addedAt — when a board joined this account's boards, which is when it was created for its own boards and when the share link was first opened for shared ones — so a board shared this morning leads the list however old it is. createdAt is when the board itself was made, and updatedAt when it last changed, by anyone. Each board's source says how you reach it: owned for your own, workspace for one owned by a workspace you belong to, and shared for one somebody sent you a link to. Returns up to ${BOARD_SEARCH_PAGE_SIZE} boards, each with a boardId that get_board_info and the other tools take. If the result carries a nextCursor there are more boards: call again with that cursor to get the next page. An empty result is a normal result, not an error.`,
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				cursor: {
					type: 'string',
					description:
						'The nextCursor from a previous result, to get the next page. Omit for the first page.',
				},
			},
			required: [],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	} as const
}

function getSearchBoardsToolDefinition(nameMatchingEnabled: boolean) {
	if (!nameMatchingEnabled) return getListBoardsToolDefinition()
	return {
		name: SEARCH_BOARDS_TOOL_NAME,
		title: 'Search tldraw boards',
		description: `Find tldraw.com boards by name among this account's own boards, its workspaces' boards, and boards shared with it by link that it has opened. Every word of the query must appear in the board name, in any order, ignoring case; use up to ${BOARD_SEARCH_MAX_TERMS} distinctive words (at most ${BOARD_SEARCH_MAX_QUERY_LENGTH} characters), not a whole title. Omit the query to list boards. Returns up to ${BOARD_SEARCH_PAGE_SIZE} boards, each with a boardId the other tools take. No match is an empty result, not an error.`,
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				query: {
					type: 'string',
					maxLength: BOARD_SEARCH_MAX_QUERY_LENGTH,
					description: `Up to ${BOARD_SEARCH_MAX_TERMS} words to match against board names, separated by spaces. At most ${BOARD_SEARCH_MAX_QUERY_LENGTH} characters. Every word must appear in the name, in any order. Omit to list your newest boards.`,
				},
				cursor: {
					type: 'string',
					description:
						'The nextCursor from a previous search_boards result, to get the next page. Omit for the first page.',
				},
			},
			required: [],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	}
}

function getListWorkspacesToolDefinition() {
	return {
		name: LIST_WORKSPACES_TOOL_NAME,
		title: 'List tldraw workspaces',
		description:
			'List the tldraw.com workspaces this account belongs to, including its personal workspace. Each workspace comes with its id, name, whether it is the personal one, and this account’s role in it. create_board accepts any of them as workspace.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {},
			required: [],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	} as const
}

function getCreateBoardToolDefinition() {
	return {
		name: CREATE_BOARD_TOOL_NAME,
		title: 'Create tldraw board',
		description:
			'Create a new, empty tldraw.com board and return its boardId and url. Open the url, or ask the user to, before using the read tools on it. The board goes in your personal workspace unless you name another workspace you belong to and can add boards to — a name or id from list_workspaces, or the workspaceName search_boards reports. If the workspace you name is not one of those, the error lists the ones you can use. The new board is shared by link for editing, the same as a board created on tldraw.com.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				name: {
					type: 'string',
					maxLength: BOARD_NAME_MAX_LENGTH,
					description: 'The title for the new board.',
				},
				workspace: {
					type: 'string',
					description:
						'The name or id of the workspace to create the board in. Omit to use your personal workspace.',
				},
			},
			required: ['name'],
		},
		annotations: {
			readOnlyHint: false,
			idempotentHint: false,
			openWorldHint: false,
			destructiveHint: false,
		},
	}
}

function getRenameBoardToolDefinition() {
	return {
		name: RENAME_BOARD_TOOL_NAME,
		title: 'Rename tldraw board',
		description:
			'Rename a tldraw.com board and return its new and previous names. You can rename boards in your own workspace and boards owned by a workspace you belong to; a board only shared with you by link cannot be renamed.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				// Not BOARD_ID_PROPERTY: a published /p/ slug is a copy's id, not the file's, so it
				// cannot name the board to rename.
				boardId: {
					type: 'string',
					description:
						'The id of the board to rename: a boardId from search_boards or create_board, or the :slug of a file URL (https://www.tldraw.com/f/:slug).',
				},
				name: {
					type: 'string',
					maxLength: BOARD_NAME_MAX_LENGTH,
					description: 'The new title for the board.',
				},
			},
			required: ['boardId', 'name'],
		},
		annotations: {
			readOnlyHint: false,
			idempotentHint: true,
			openWorldHint: false,
			destructiveHint: false,
		},
	}
}

function getBoardInfoToolDefinition() {
	return {
		name: BOARD_INFO_TOOL_NAME,
		title: 'Get tldraw board info',
		description:
			'Return metadata for a tldraw.com board you have access to: its name, page count, and the id, name, 0-based index, and hasContent flag for each page. Call this first, then pass a page id or index to get_page_info.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: BOARD_ID_PROPERTY,
			},
			required: ['boardId'],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	}
}

function getPageInfoToolDefinition() {
	return {
		name: PAGE_INFO_TOOL_NAME,
		title: 'Get tldraw page info',
		description: `List the clusters on one page of a tldraw.com board you have access to. ${NEEDS_OPEN_TAB} A cluster is a group of shapes that belong together: shapes near each other, shapes inside a frame, group or larger shape, and shapes joined by arrows, together with those arrows. Every shape is in exactly one cluster. Each cluster has an id, a label (its frame name, or else its largest text, the top-left one among equals, then a keyword that sets it apart; one with no text is labelled by what it holds, such as "12 freehand strokes"), keywords drawn from all its text, its shape count, and its page-space bounds {x, y, w, h}, or null when none of its shapes could be measured; the page’s bounds cover all its content. Clusters come largest first, and clusterCount is the page’s total. An answer too large for one response stops part-way and carries nextCursor: call again with the same page and that cursor for the rest, or stop once you have what you need. Use the bounds to see which clusters sit near each other without opening them. Handwriting and drawings can only be seen with get_cluster_screenshot. Pass cluster ids to get_cluster_info or get_cluster_screenshot.`,
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: FILE_BOARD_ID_PROPERTY,
				page: PAGE_PROPERTY,
				cursor: {
					type: 'string',
					description:
						'The nextCursor from a previous get_page_info result, to get the next clusters. Omit for the first. Pass the same page with it.',
				},
			},
			required: ['boardId'],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	}
}

function getClusterInfoToolDefinition() {
	return {
		name: CLUSTER_INFO_TOOL_NAME,
		title: 'Get tldraw cluster info',
		description: `Describe one or more clusters from get_page_info: for each, in the order asked, its label, keywords, and every shape it contains. ${NEEDS_OPEN_TAB} Ask for several clusters in one call rather than one call each. An answer too large for one response stops part-way and carries nextCursor: call again with the same clusterIds and that cursor for the rest. A cluster too large for one answer is split across as many answers as it needs, and each slice carries firstShapeIndex: where the slice starts within the whole cluster. numberOfShapes is always the cluster's total. All positions are in page space, whatever the shape's parent: pageX and pageY are the shape's origin on the page (an arrow's is its drawn start, and null when props.start is), and pageRotation its rotation on the page (arrows have none; their ends say which way they point). parentId still names the frame or group a shape sits in. On an arrow, props.start and props.end are its ends as drawn, each { pageX, pageY } (null for a bound end the editor could not measure), and props.bindingFromId and props.bindingToId are the shapes its start and end are bound to, or null when free. \`props\` holds the rest of the record — size and style in the shape's own unrotated space; w and h are a shape's size as drawn, so a geo's h already includes its label's growth (growY, not reported separately), and a text's, group's or freehand stroke's are measured — with the rich text document replaced by \`props.text\`, the plain string the editor reports, which also surfaces text not stored on the record (a geo shape's label, for instance). Every number is rounded to thousandths, in the record's own units: angles in radians, and values that run 0–1 on the record (opacity, labelPosition and so on) as fractions. \`meta\` is passed through as stored. Draw and highlight shapes give their size and props.pointCount but not their strokes, which can't be read from coordinates: to see what was drawn or written, call get_cluster_screenshot.`,
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: FILE_BOARD_ID_PROPERTY,
				page: PAGE_PROPERTY,
				clusterIds: {
					type: 'array',
					items: { type: 'string' },
					maxItems: CLUSTER_INFO_MAX_IDS,
					description:
						'One or more cluster ids from get_page_info. All of them must be on the given page. A bare string is also accepted for a single cluster.',
				},
				cursor: {
					type: 'string',
					description:
						'The nextCursor from a previous get_cluster_info result, to get the rest of its answer. Omit for the first. Pass the same clusterIds with it.',
				},
			},
			required: ['boardId', 'clusterIds'],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	}
}

function getClusterScreenshotToolDefinition() {
	return {
		name: CLUSTER_SCREENSHOT_TOOL_NAME,
		title: 'Get tldraw cluster screenshot',
		description: `Return a ${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT} PNG of one or more clusters from get_page_info, preceded by the page name. The board must be open in the user’s browser tab, on this page: if it is not, ask them to open it or switch to it. The camera fits the clusters requested and only their shapes are drawn, so nothing else on the page appears. Pass several ids to see how those clusters sit relative to each other in a single image. This is the direct route from a cluster id to a picture — get_cluster_info is only needed when the individual shapes matter.`,
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: FILE_BOARD_ID_PROPERTY,
				page: {
					type: ['number', 'string'],
					description:
						'Which page: either its 0-based index or its page id from get_board_info. Ids survive page reordering, indexes do not. Defaults to 0, the first page.',
					default: 0,
				},
				clusterIds: {
					type: 'array',
					items: { type: 'string' },
					description:
						'One or more cluster ids from get_page_info. All of them must be on the given page. A bare string is also accepted for a single cluster.',
				},
				theme: {
					type: 'string',
					enum: ['light', 'dark'],
					default: 'light',
				},
			},
			required: ['boardId', 'page', 'clusterIds'],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	}
}

// --- JSON-RPC -----------------------------------------------------------------------------------
//
// The protocol envelope, shared so that a local harness and the deployed Worker present the same
// handshake — including `instructions`, which a model reads before it calls anything.

export type JsonRpcId = string | number | null

export interface JsonRpcRequest {
	jsonrpc?: string
	id?: JsonRpcId
	method?: string
	params?: {
		name?: string
		arguments?: unknown
	}
}

export type McpReply =
	/** A notification (no id): acknowledged with 202 and no body. */
	| { kind: 'accepted' }
	| { kind: 'result'; id: JsonRpcId; result: unknown }
	| { kind: 'error'; id: JsonRpcId; code: number; message: string }

/**
 * Dispatches one JSON-RPC request. Everything that depends on where the server runs — reading the
 * board, spending a browser, rate limits — lives behind `callTool`, which the caller supplies.
 */
export async function handleMcpJsonRpc(
	rpcRequest: JsonRpcRequest,
	callTool: (name: string, args: unknown) => Promise<ToolResult>,
	// Defaulted the way an unset MCP_SEARCH_NAME_MATCHING_ENABLED reads, so the eval harness and
	// tests exercise the full tool unless they say otherwise.
	nameMatchingEnabled = true
): Promise<McpReply> {
	if (rpcRequest.id === undefined) {
		return { kind: 'accepted' }
	}
	const id = rpcRequest.id

	switch (rpcRequest.method) {
		case 'initialize':
			return {
				kind: 'result',
				id,
				result: {
					protocolVersion: MCP_PROTOCOL_VERSION,
					capabilities: { tools: {} },
					serverInfo: MCP_SERVER_INFO,
					instructions: getMcpServerInstructions(nameMatchingEnabled),
				},
			}
		case 'ping':
			return { kind: 'result', id, result: {} }
		case 'tools/list':
			return { kind: 'result', id, result: { tools: getToolDefinitions(nameMatchingEnabled) } }
		case 'tools/call': {
			const name = rpcRequest.params?.name
			if (!name || !(TOOL_NAMES as readonly string[]).includes(name)) {
				return { kind: 'error', id, code: -32602, message: `Unknown tool: ${name}` }
			}
			return { kind: 'result', id, result: await callTool(name, rpcRequest.params?.arguments) }
		}
		default:
			return {
				kind: 'error',
				id,
				code: -32601,
				message: `Method not found: ${rpcRequest.method}`,
			}
	}
}
