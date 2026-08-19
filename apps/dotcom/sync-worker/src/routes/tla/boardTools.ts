import {
	ClusterBounds,
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_PAGES,
	ShapeCluster,
	getShapeClusters,
	getShapeText,
	type TLShapeWithPlainText,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { TLShape, isPage, isShape } from '@tldraw/tlschema'
import { getDocumentNameFromSnapshot } from '../getDocumentNameFromSnapshot'

// Everything about this MCP server that a model can perceive: the protocol handshake and its
// instructions, the tool names, titles and descriptions, how arguments are parsed and how bad ones
// are refused, how a page's shapes are grouped and labelled, what a shape record looks like once
// it's readable, and the wording of every error a model has to recover from.
//
// Deliberately pure. It takes a room snapshot and a table of shape measurements — data — and returns
// tool results. It knows nothing about Postgres, R2, Browser Rendering, rate limits, caching or
// telemetry; sharedBoardScreenshotMcp.ts owns all of that and calls in here.
//
// The split is what makes this server evaluable. The private eval harness sends checked-in board
// fixtures to the local-only route in evalsLocalMcp.ts, which serves these exact functions. A run
// therefore exercises the real tool descriptions and error strings without a database, browser or
// rate limiter. Anything a model can read must live here, or an eval stops being evidence about the
// deployed server.

export const MCP_PROTOCOL_VERSION = '2025-11-25'

export const MCP_SERVER_INFO = {
	name: 'tldraw-shared-board-screenshot',
	title: 'tldraw board screenshots',
	version: '3.0.0',
}

export const MCP_SERVER_INSTRUCTIONS =
	'MCP server for tldraw.com boards you have access to. Drill down in order: get_board_info lists a board’s pages, get_page_info lists one page’s clusters of shapes, and get_cluster_screenshot returns a PNG of one or more clusters. get_cluster_info describes the shapes inside a cluster when those matter. Accepts published tldraw.com/p/:slug boards, link-shared tldraw.com/f/:slug files, and your own private boards, rendered through a signed, tldraw-owned render job.'

export const BOARD_INFO_TOOL_NAME = 'get_board_info'
export const PAGE_INFO_TOOL_NAME = 'get_page_info'
export const CLUSTER_INFO_TOOL_NAME = 'get_cluster_info'
export const CLUSTER_SCREENSHOT_TOOL_NAME = 'get_cluster_screenshot'

export const TOOL_NAMES = [
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
	'No board was found with this id, or this account does not have access to it. Boards you own, boards shared with you via link, and published boards are supported.'
export const BOARD_EMPTY_MESSAGE = 'This board has no saved content yet.'

// --- Reading a snapshot -------------------------------------------------------------------------

/** What one shape's measure render produced: its page bounds, plus the text its ShapeUtil reported. */
export interface ShapeMeasurement extends ClusterBounds {
	text?: string
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

export function parseBoardInfoInput(input: unknown): { boardId: string } {
	const value = requireArgumentsObject(input)
	return { boardId: parseBoardId(value.boardId) }
}

export function parsePageInfoInput(input: unknown): { boardId: string; page: PageSelector } {
	const value = requireArgumentsObject(input)
	return { boardId: parseBoardId(value.boardId), page: parsePageSelector(value.page) }
}

export function parseClusterInfoInput(input: unknown): {
	boardId: string
	page: PageSelector
	clusterId: string
} {
	const value = requireArgumentsObject(input)
	return {
		boardId: parseBoardId(value.boardId),
		page: parsePageSelector(value.page),
		clusterId: parseClusterId(value.clusterId),
	}
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

// Accepts one id or several. A single string is allowed because asking for one cluster is the common
// case and making callers wrap it in an array is friction for nothing.
export function parseClusterIds(value: unknown): string[] {
	if (typeof value === 'string') return [parseClusterId(value)]
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error('clusterIds is required: a cluster id, or an array of them')
	}
	return value.map((id) => parseClusterId(id))
}

export function parseClusterId(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error('clusterId is required')
	}
	return value
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

export function getBoardInfo(snapshot: RoomSnapshot): ToolResult {
	const pages = enumerateBoardPages(snapshot)
	return toolJsonResult({
		name: getDocumentNameFromSnapshot(snapshot),
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

// Every page-scoped tool needs the same steps before it can do anything: validate the page selector
// and pull that page's shapes. Returning the tool's own error shape on failure keeps the wording
// identical across tools.
//
// Separate from the tools below because the caller has to know the page id before it can measure the
// page, and measuring is what produces the `measurements` those tools need.
export type ResolvedPage =
	| { ok: true; pageId: string; pageName: string; shapes: TLShape[] }
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
	return {
		ok: true,
		pageId: targetPage.id,
		pageName: targetPage.name,
		shapes: getShapesOnPage(snapshot, targetPage.id),
	}
}

export type ResolvedPageOk = Extract<ResolvedPage, { ok: true }>

// The measure render answers two things a Worker cannot: where each shape sits, and what
// ShapeUtil.getText says it holds. Bounds drive the linkage; the text is attached to the shapes so
// labelling reads the editor's answer rather than re-deriving one from props.
function clusterPage(page: ResolvedPageOk, measurements: Record<string, ShapeMeasurement>) {
	const shapes: TLShapeWithPlainText[] = page.shapes.map((shape) => {
		const text = measurements[shape.id as string]?.text
		return text ? { ...shape, plainText: text } : shape
	})

	return getShapeClusters(shapes, page.pageId, measurements)
}

// --- The cluster index --------------------------------------------------------------------------
//
// What a measure render is worth keeping for. Clustering a page needs two things only an editor can
// answer — where each shape sits, and what its ShapeUtil.getText reports — and both cost a full
// Browser Run session to obtain. The *answer*, though, is small and stays true for as long as the
// board's content does: the same shapes group the same way and carry the same text.
//
// So the render's output is reduced to this once, and the three tools that cluster read it instead of
// measuring again (sharedBoardScreenshotMcp.ts caches it in the file's Durable Object, keyed by the
// board's content version). Bounds are deliberately *not* kept: they exist to decide which atoms
// merge, and that decision is already baked into `clusters`.
//
// `text` is kept, because it is not derivable. `getShapeText` can approximate it from the stored
// record, but only the editor knows what a shape actually renders, so dropping it here would quietly
// change what get_cluster_info reports for exactly the shapes a fallback handles worst.

/** One cluster as stored: identity, labelling, and the shapes that make it up. */
export interface StoredCluster {
	id: string
	label: string
	keywords: string[]
	/** In `getShapeClusters` order, which is snapshot order, so a rehydrated cluster reads the same. */
	shapeIds: string[]
}

/**
 * A page's clustering, reduced to what survives a round trip through storage.
 *
 * Bump `CLUSTER_INDEX_FORMAT_VERSION` whenever this shape changes, or whenever clustering or
 * labelling changes in a way that would make a stored index disagree with a fresh measure — the
 * content version in the cache key rotates on edits, not on deploys, so nothing else invalidates a
 * stored index when the code that produced it moves.
 */
export interface PageClusterIndex {
	v: number
	clusters: StoredCluster[]
	/** The text the measure render's editor reported, by shape id. Absent for shapes with none. */
	text: Record<string, string>
}

export const CLUSTER_INDEX_FORMAT_VERSION = 1

/** Reduces a measure render's output for the page it measured. */
export function buildClusterIndex(
	page: ResolvedPageOk,
	measurements: Record<string, ShapeMeasurement>
): PageClusterIndex {
	const onPage = new Set(page.shapes.map((shape) => String(shape.id)))
	const text: Record<string, string> = {}
	for (const [shapeId, measurement] of Object.entries(measurements)) {
		// Scoped to the page it belongs to: the index is keyed per page, and a measurement for anything
		// else would be dead weight in every read of it.
		if (!onPage.has(shapeId)) continue
		if (typeof measurement.text === 'string' && measurement.text.length > 0) {
			text[shapeId] = measurement.text
		}
	}

	return {
		v: CLUSTER_INDEX_FORMAT_VERSION,
		clusters: clusterPage(page, measurements).map((cluster) => ({
			id: cluster.id,
			label: cluster.label,
			keywords: cluster.keywords,
			shapeIds: cluster.shapes.map((shape) => String(shape.id)),
		})),
		text,
	}
}

/**
 * Reads an index back out of storage, or null if it is anything other than one this build wrote.
 *
 * Everything about it is checked rather than trusted. It is our own data, but it crosses a version
 * boundary — a Durable Object holds rows written by whichever build was deployed when the board was
 * last measured — and the cost of being wrong is a tool answering from a shape that no longer means
 * what it did. A null here is a cache miss, which costs one render and is always safe.
 */
export function parseClusterIndex(json: string): PageClusterIndex | null {
	let value: unknown
	try {
		value = JSON.parse(json)
	} catch {
		return null
	}
	if (!value || typeof value !== 'object') return null
	const candidate = value as Partial<PageClusterIndex>
	if (candidate.v !== CLUSTER_INDEX_FORMAT_VERSION) return null
	if (!Array.isArray(candidate.clusters)) return null
	if (!candidate.text || typeof candidate.text !== 'object' || Array.isArray(candidate.text)) {
		return null
	}

	const clusters: StoredCluster[] = []
	for (const cluster of candidate.clusters) {
		if (!cluster || typeof cluster !== 'object') return null
		const { id, label, keywords, shapeIds } = cluster as Partial<StoredCluster>
		if (typeof id !== 'string' || typeof label !== 'string') return null
		if (!isStringArray(keywords) || !isStringArray(shapeIds)) return null
		clusters.push({ id, label, keywords, shapeIds })
	}

	const text: Record<string, string> = {}
	for (const [shapeId, shapeText] of Object.entries(candidate.text)) {
		if (typeof shapeText !== 'string') return null
		text[shapeId] = shapeText
	}

	return { v: CLUSTER_INDEX_FORMAT_VERSION, clusters, text }
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

/**
 * Rebuilds full clusters from a stored index and the page it was built for.
 *
 * Returns null when the two disagree — a shape the index names is not on the page. In principle that
 * cannot happen, since an index is only ever read back for the exact content version it was built
 * from; in practice it is the one check that keeps a mismatch from being served as fact, and a null
 * costs nothing worse than the render the cache was avoiding.
 */
function clustersFromIndex(page: ResolvedPageOk, index: PageClusterIndex): ShapeCluster[] | null {
	const byId = new Map(page.shapes.map((shape) => [String(shape.id), shape]))
	const clusters: ShapeCluster[] = []

	for (const cluster of index.clusters) {
		const shapes: TLShapeWithPlainText[] = []
		for (const shapeId of cluster.shapeIds) {
			const shape = byId.get(shapeId)
			if (!shape) return null
			const text = index.text[shapeId]
			shapes.push(text ? { ...shape, plainText: text } : shape)
		}
		clusters.push({
			id: cluster.id,
			label: cluster.label,
			keywords: cluster.keywords,
			numberOfShapes: shapes.length,
			shapes,
		})
	}

	return clusters
}

/**
 * Whether a stored index can answer for this page at all, asked before a caller commits to using it.
 *
 * Separate from the tools below so the cache read is the one place that decides hit or miss: a tool
 * handed an index has already been told it fits, and never has to carry a second "or measure after
 * all" path through its own error handling.
 */
export function isClusterIndexUsable(page: ResolvedPageOk, index: PageClusterIndex): boolean {
	return clustersFromIndex(page, index) !== null
}

// The three clustering tools below take an index rather than measurements, so that a call served from
// a cached index and a call served from a fresh render run the exact same code from here on. The
// measurement-taking overloads are what the eval harness and the tests call: they measure, reduce,
// and then go through the same door.

export function getPageInfo(
	page: ResolvedPageOk,
	measurements: Record<string, ShapeMeasurement>
): ToolResult {
	return getPageInfoFromIndex(page, buildClusterIndex(page, measurements))
}

export function getPageInfoFromIndex(page: ResolvedPageOk, index: PageClusterIndex): ToolResult {
	// Scoped to the requested page: get_cluster_info and get_cluster_screenshot both resolve cluster
	// ids against a single page, so listing every shape on the board here would hand out ids that
	// neither of them can look up.
	const clusters = clustersFromIndex(page, index) ?? []
	return toolJsonResult({
		name: page.pageName,
		clusterCount: clusters.length,
		clusters: clusters.map((c) => ({
			id: c.id,
			label: c.label,
			keywords: c.keywords,
			numberOfShapes: c.numberOfShapes,
		})),
	})
}

export function getClusterInfo(
	page: ResolvedPageOk,
	measurements: Record<string, ShapeMeasurement>,
	clusterId: string,
	selector: PageSelector
): ToolResult {
	return getClusterInfoFromIndex(page, buildClusterIndex(page, measurements), clusterId, selector)
}

export function getClusterInfoFromIndex(
	page: ResolvedPageOk,
	index: PageClusterIndex,
	clusterId: string,
	selector: PageSelector
): ToolResult {
	const cluster = (clustersFromIndex(page, index) ?? []).find((c) => c.id === clusterId)
	if (!cluster) {
		return toolError(
			`No cluster with id "${clusterId}" on page ${describePageSelector(selector)}. Call get_page_info to list this page's clusters.`
		)
	}

	return toolJsonResult({
		clusterId: cluster.id,
		label: cluster.label,
		keywords: cluster.keywords,
		pageName: page.pageName,
		numberOfShapes: cluster.numberOfShapes,
		shapes: cluster.shapes.map(toReadableShape),
	})
}

export type PickedShapes = { ok: true; shapeIds: string[] } | { ok: false; result: ToolResult }

/**
 * The shapes to draw for a `get_cluster_screenshot` call. Separate from the capture itself, which is
 * the route's job: this only says *which* shapes, from ids the model supplied.
 */
export function pickClusterShapes(
	page: ResolvedPageOk,
	measurements: Record<string, ShapeMeasurement>,
	clusterIds: string[],
	selector: PageSelector
): PickedShapes {
	return pickClusterShapesFromIndex(
		page,
		buildClusterIndex(page, measurements),
		clusterIds,
		selector
	)
}

export function pickClusterShapesFromIndex(
	page: ResolvedPageOk,
	index: PageClusterIndex,
	clusterIds: string[],
	selector: PageSelector
): PickedShapes {
	const clusters = clustersFromIndex(page, index) ?? []
	const byId = new Map(clusters.map((cluster) => [cluster.id, cluster]))

	// Reject unknown ids rather than quietly rendering the subset that resolved — a caller asking for
	// three clusters and getting a picture of two has no way to notice.
	const missing = clusterIds.filter((id) => !byId.has(id))
	if (missing.length > 0) {
		return {
			ok: false,
			result: toolError(
				`No cluster on page ${describePageSelector(selector)} with id ${missing.map((id) => `"${id}"`).join(', ')}. Call get_page_info to list this page's clusters.`
			),
		}
	}

	// Several clusters render as one framed image of their union, which is the point of taking more
	// than one: seeing how they sit relative to each other.
	return {
		ok: true,
		shapeIds: [
			...new Set(
				clusterIds.flatMap((id) => byId.get(id)!.shapes.map((shape) => shape.id as string))
			),
		],
	}
}

// The shape as stored, with one substitution: `props.richText` — a ProseMirror document, deeply
// nested and unreadable — is dropped in favour of the plain string the editor's ShapeUtil.getText
// reported for that shape during the measure render. Everything else is passed through untouched, so
// a caller still sees type, position, rotation, size, colour and the rest exactly as stored.
//
// This matters beyond readability: a geo shape's label is not in `props` at all under any key a
// Worker could find, so without the editor's answer that text is simply invisible.
function toReadableShape(shape: TLShapeWithPlainText) {
	const { plainText, ...rest } = shape
	const props = { ...(rest.props as Record<string, unknown>) }
	delete props.richText

	const text = plainText ?? getShapeText(shape)
	if (text) props.text = text
	else delete props.text

	return { ...rest, props }
}

// --- Tool definitions ---------------------------------------------------------------------------

export function getToolDefinitions() {
	return [
		getBoardInfoToolDefinition(),
		getPageInfoToolDefinition(),
		getClusterInfoToolDefinition(),
		getClusterScreenshotToolDefinition(),
	]
}

const BOARD_ID_PROPERTY = {
	type: 'string',
	description:
		'The id of a tldraw.com board: the :slug of a file URL (https://www.tldraw.com/f/:slug) you own or that was shared with you, or of a published board URL (https://www.tldraw.com/p/:slug).',
}

const READ_ONLY_ANNOTATIONS = {
	readOnlyHint: true,
	idempotentHint: true,
	openWorldHint: false,
	destructiveHint: false,
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
		description:
			'List the shape clusters on one page of a tldraw.com board you have access to. Each top-level shape is a cluster together with its descendants, so frames and groups stay together while ungrouped shapes remain individually addressable. Pass a cluster id to get_cluster_info or get_cluster_screenshot.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: BOARD_ID_PROPERTY,
				page: {
					type: ['number', 'string'],
					description:
						'The page id or 0-based index from get_board_info. Defaults to 0, the first page.',
					default: 0,
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
		description:
			"Describe one cluster from get_page_info: its label, keywords, and the full record of every shape it contains — type, position, rotation, size, style and so on. Each shape's rich text document is replaced by `props.text`, the plain string the editor reports for it, which also surfaces text that is not stored on the record at all (a geo shape's label, for instance).",
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: BOARD_ID_PROPERTY,
				page: {
					type: ['number', 'string'],
					description:
						'The page id or 0-based index from get_board_info. Defaults to 0, the first page.',
					default: 0,
				},
				clusterId: {
					type: 'string',
					description: 'The id of the cluster to get info for.',
				},
			},
			required: ['boardId', 'clusterId'],
		},
		annotations: READ_ONLY_ANNOTATIONS,
	}
}

function getClusterScreenshotToolDefinition() {
	return {
		name: CLUSTER_SCREENSHOT_TOOL_NAME,
		title: 'Get tldraw cluster screenshot',
		description: `Return a ${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT} PNG of one or more clusters from get_page_info, preceded by the page name. The camera fits the clusters requested and only their shapes are drawn, so nothing else on the page appears. Pass several ids to see how those clusters sit relative to each other in a single image. This is the direct route from a cluster id to a picture — get_cluster_info is only needed when the individual shapes matter.`,
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: BOARD_ID_PROPERTY,
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
	callTool: (name: string, args: unknown) => Promise<ToolResult>
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
					instructions: MCP_SERVER_INSTRUCTIONS,
				},
			}
		case 'ping':
			return { kind: 'result', id, result: {} }
		case 'tools/list':
			return { kind: 'result', id, result: { tools: getToolDefinitions() } }
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
