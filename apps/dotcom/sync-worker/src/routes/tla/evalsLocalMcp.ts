import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getDocumentNameFromSnapshot } from '../getDocumentNameFromSnapshot'
import {
	BOARD_INFO_TOOL_NAME,
	BOARD_NOT_FOUND_MESSAGE,
	CLUSTER_INFO_TOOL_NAME,
	CLUSTER_SCREENSHOT_TOOL_NAME,
	PAGE_INFO_TOOL_NAME,
	SEARCH_BOARDS_TOOL_NAME,
	ShapeMeasurement,
	ToolResult,
	compareBoardSearchOrder,
	getBoardInfo,
	getBoardSearchResults,
	clusterPage,
	getClusterInfo,
	getPageInfo,
	handleMcpJsonRpc,
	isAfterBoardSearchCursor,
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	parsePageInfoInput,
	parseSearchBoardsInput,
	pickClusterShapes,
	resolvePage,
	toolError,
	toolPageResult,
} from './boardTools'

const HARNESS_GAP_MARKER = '[harness-gap]'

// Insertion order is the fixture stand-in for creation time, but a bare index would have every eval
// board report a 1970 timestamp — and a model reasoning about "my newest board" reads those. Spaced
// an hour apart from a fixed date rather than from `Date.now()`, so two runs over the same fixtures
// produce byte-identical results.
const FIXTURE_CREATED_AT_BASE_MS = Date.UTC(2026, 0, 5, 9, 0, 0)
const FIXTURE_CREATED_AT_STEP_MS = 60 * 60 * 1000

function fixtureTimestamp(index: number): number {
	return FIXTURE_CREATED_AT_BASE_MS + index * FIXTURE_CREATED_AT_STEP_MS
}

interface FixtureBoard {
	snapshot: RoomSnapshot
	measurements: Record<string, ShapeMeasurement>
	shots: Record<string, string>
}

interface ScreenshotPlanEntry {
	pageId: string
	clusterIds: string[]
	shapeIds: string[]
}

const sessions = new Map<string, Map<string, FixtureBoard>>()

function notFoundUnlessLocal(env: Environment): Response | null {
	return env.IS_LOCAL === 'true' ? null : new Response('Not Found', { status: 404 })
}

function screenshotFileName(clusterIds: string[], theme: 'light' | 'dark') {
	const key = [...clusterIds]
		.sort()
		.join('+')
		.replace(/[^a-zA-Z0-9+_-]/g, '_')
	return `${key}.${theme}.png`
}

function textOf(result: ToolResult): string {
	const block = result.content.find((part) => part.type === 'text')
	if (!block || block.type !== 'text') throw new Error('Expected a text tool result')
	return block.text
}

export function getEvalsFixtureScreenshotPlan(
	snapshot: RoomSnapshot,
	measurements: Record<string, ShapeMeasurement>
): ScreenshotPlanEntry[] {
	const pages = JSON.parse(textOf(getBoardInfo(snapshot))) as {
		pages: Array<{ id: string }>
	}
	const plan: ScreenshotPlanEntry[] = []
	for (const page of pages.pages) {
		const selector = { kind: 'id', id: page.id } as const
		const resolved = resolvePage(snapshot, selector)
		if (!resolved.ok) continue
		const clusters = clusterPage(resolved, measurements)
		const info = JSON.parse(textOf(getPageInfo(resolved, clusters))) as {
			clusters: Array<{ id: string }>
		}
		const clusterIds = info.clusters.map((cluster) => cluster.id)
		const sets = [...clusterIds.map((id) => [id]), ...(clusterIds.length > 1 ? [clusterIds] : [])]
		for (const set of sets) {
			const picked = pickClusterShapes(clusters, set, selector)
			if (!picked.ok || picked.shapeIds.length === 0) continue
			plan.push({ pageId: page.id, clusterIds: set, shapeIds: picked.shapeIds })
		}
	}
	return plan
}

export async function planEvalsFixtureScreenshots(
	request: IRequest,
	env: Environment
): Promise<Response> {
	const unavailable = notFoundUnlessLocal(env)
	if (unavailable) return unavailable
	const body = (await request.json()) as {
		snapshot: RoomSnapshot
		measurements: Record<string, ShapeMeasurement>
	}
	return Response.json({ plan: getEvalsFixtureScreenshotPlan(body.snapshot, body.measurements) })
}

export async function putEvalsFixtureBoard(request: IRequest, env: Environment): Promise<Response> {
	const unavailable = notFoundUnlessLocal(env)
	if (unavailable) return unavailable
	const board = (await request.json()) as FixtureBoard
	let session = sessions.get(request.params.sessionId)
	if (!session) {
		session = new Map()
		sessions.set(request.params.sessionId, session)
	}
	session.set(request.params.boardId, board)
	return Response.json({ stored: true }, { status: 201 })
}

export function deleteEvalsFixtureSession(request: IRequest, env: Environment): Response {
	const unavailable = notFoundUnlessLocal(env)
	if (unavailable) return unavailable
	sessions.delete(request.params.sessionId)
	return Response.json({ deleted: true })
}

async function callFixtureTool(
	name: string,
	args: unknown,
	boards: Map<string, FixtureBoard>
): Promise<ToolResult> {
	try {
		switch (name) {
			case SEARCH_BOARDS_TOOL_NAME: {
				const { terms, cursor } = parseSearchBoardsInput(args)
				// The session is the whole "account": every board in it is one the caller owns. Names
				// come from the snapshot, since a fixture has no `file` row to carry one, and
				// insertion order stands in for creation order — so ordering and paging behave the
				// way they do in production without fixtures needing timestamps.
				const rows = [...boards.entries()]
					.map(([id, board], index) => ({
						id,
						name: getDocumentNameFromSnapshot(board.snapshot) ?? '',
						createdAt: fixtureTimestamp(index),
						updatedAt: fixtureTimestamp(index),
						workspaceName: '',
						isPersonal: true,
					}))
					.filter((row) =>
						terms.every((term) => row.name.toLowerCase().includes(term.toLowerCase()))
					)
					.sort(compareBoardSearchOrder)
					.filter((row) => !cursor || isAfterBoardSearchCursor(row, cursor))
				return getBoardSearchResults(rows)
			}
			case BOARD_INFO_TOOL_NAME: {
				const { boardId } = parseBoardInfoInput(args)
				const board = boards.get(boardId)
				return board ? getBoardInfo(board.snapshot) : toolError(BOARD_NOT_FOUND_MESSAGE)
			}
			case PAGE_INFO_TOOL_NAME: {
				const { boardId, page } = parsePageInfoInput(args)
				const board = boards.get(boardId)
				if (!board) return toolError(BOARD_NOT_FOUND_MESSAGE)
				const resolved = resolvePage(board.snapshot, page)
				return resolved.ok
					? getPageInfo(resolved, clusterPage(resolved, board.measurements))
					: resolved.result
			}
			case CLUSTER_INFO_TOOL_NAME: {
				const { boardId, page, clusterId } = parseClusterInfoInput(args)
				const board = boards.get(boardId)
				if (!board) return toolError(BOARD_NOT_FOUND_MESSAGE)
				const resolved = resolvePage(board.snapshot, page)
				return resolved.ok
					? getClusterInfo(resolved, clusterPage(resolved, board.measurements), clusterId, page)
					: resolved.result
			}
			case CLUSTER_SCREENSHOT_TOOL_NAME: {
				const { boardId, page, clusterIds, theme } = parseClusterScreenshotInput(args)
				const board = boards.get(boardId)
				if (!board) return toolError(BOARD_NOT_FOUND_MESSAGE)
				const resolved = resolvePage(board.snapshot, page)
				if (!resolved.ok) return resolved.result
				const picked = pickClusterShapes(
					clusterPage(resolved, board.measurements),
					clusterIds,
					page
				)
				if (!picked.ok) return picked.result
				const png = board.shots[screenshotFileName(clusterIds, theme)]
				return png
					? toolPageResult(resolved.pageName, png)
					: toolError(
							`${HARNESS_GAP_MARKER} No screenshot was built for this cluster set. Run against staging or production to see the real render.`
						)
			}
			default:
				return toolError(`Unknown tool: ${name}`)
		}
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}
}

export async function evalsFixtureMcp(request: IRequest, env: Environment): Promise<Response> {
	const unavailable = notFoundUnlessLocal(env)
	if (unavailable) return unavailable
	const boards = sessions.get(request.params.sessionId)
	if (!boards) return new Response('Eval fixture session not found', { status: 404 })

	let rpcRequest: Parameters<typeof handleMcpJsonRpc>[0]
	try {
		rpcRequest = (await request.json()) as Parameters<typeof handleMcpJsonRpc>[0]
	} catch {
		return Response.json(
			{ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
			{ status: 200 }
		)
	}
	const reply = await handleMcpJsonRpc(rpcRequest, (name, args) =>
		callFixtureTool(name, args, boards)
	)
	if (reply.kind === 'accepted') return new Response(null, { status: 202 })
	return Response.json(
		reply.kind === 'result'
			? { jsonrpc: '2.0', id: reply.id, result: reply.result }
			: { jsonrpc: '2.0', id: reply.id, error: { code: reply.code, message: reply.message } }
	)
}

export function resetEvalsFixtureSessionsForTests() {
	sessions.clear()
}
