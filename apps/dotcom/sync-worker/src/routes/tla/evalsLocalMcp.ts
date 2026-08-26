import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import {
	BOARD_INFO_TOOL_NAME,
	BOARD_NOT_FOUND_MESSAGE,
	CLUSTER_INFO_TOOL_NAME,
	CLUSTER_SCREENSHOT_TOOL_NAME,
	PAGE_INFO_TOOL_NAME,
	ShapeMeasurement,
	ToolResult,
	getBoardInfo,
	clusterPage,
	getClusterInfo,
	getPageInfo,
	handleMcpJsonRpc,
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	parsePageInfoInput,
	pickClusterShapes,
	resolvePage,
	toolError,
	toolPageResult,
} from './boardTools'

const HARNESS_GAP_MARKER = '[harness-gap]'

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
