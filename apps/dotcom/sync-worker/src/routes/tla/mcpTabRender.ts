import { TabRenderRequest } from '@tldraw/dotcom-shared'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import {
	MAX_TAB_RENDER_REPLY_LENGTH,
	TabRenderOutcome,
	parseTabRenderReply,
} from '../../tabRenderBroker'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { isFeatureFlagEnabledForUser } from '../../utils/featureFlags'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { ShapeMeasurement } from './boardTools'
import { ResolvedThumbnailBoard, readMeasurements } from './thumbnailRender'
import { reportThumbnailError } from './thumbnailShared'

// The MCP side of rendering in an open tab: try the caller's own tab, and report back whether that
// worked. Every failure here means "use Browser Run" and nothing else, so a tool can never answer
// worse than it did without this.
//
// **What a tab produces never reaches a shared cache.** The `mcp/` PNG keys and the cluster index have
// no viewer dimension, so both are read by everyone who can see the board, and a tab is a client: its
// owner can POST whatever they like. Writing its answer back would let one viewer of a shared board
// put text and images in front of every other viewer's agent. Unwritten, a forged answer only ever
// reaches the agent of the person who forged it, which is the same trust they already extend to their
// own browser. The price is a re-measure per tool call while a tab stays open, which costs a round
// trip to the tab rather than a browser session.

interface TabRenderContext {
	request: Request
	ctx: ExecutionContext | undefined
}

async function renderInOpenTab(
	env: Environment,
	board: ResolvedThumbnailBoard,
	userId: string,
	job: TabRenderRequest,
	{ request, ctx }: TabRenderContext
): Promise<TabRenderOutcome | null> {
	// A published board is the frozen copy made when it was published. The room behind it holds the
	// live file, which is a different document from the one this tool call was asked about.
	if (board.kind !== 'shared_file') return null
	if (!(await isFeatureFlagEnabledForUser(env, 'mcp_tab_render', userId))) return null

	const startedAt = Date.now()
	try {
		const result = await getRoomDurableObject(env, board.fileId).requestTabRender(userId, job)
		writeTabRenderTelemetry(env, job.mode, result, Date.now() - startedAt)
		return result
	} catch (error) {
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_tab_render',
			extras: { mode: job.mode, kind: board.kind },
		})
		writeDataPoint(undefined, env.MEASURE, env, 'mcp_tab_render', {
			blobs: [`mode:${job.mode}`, 'outcome:error', 'reason:none'],
			doubles: [Date.now() - startedAt],
		})
		return null
	}
}

// How often a tab answers and how fast, by mode. Set against `browser_run_session` durations, this is
// the number that says whether the whole idea is paying for itself. Reason and outcome are closed
// vocabularies, and no board or user identity goes near this, in keeping with the rest of the pipeline.
function writeTabRenderTelemetry(
	env: Environment,
	mode: TabRenderRequest['mode'],
	result: TabRenderOutcome,
	durationMs: number
) {
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_tab_render', {
		blobs: [
			`mode:${mode}`,
			`outcome:${result.outcome}`,
			`reason:${result.outcome === 'declined' ? result.reason : 'none'}`,
		],
		doubles: [durationMs],
	})
}

/** The page's measurements from the caller's open tab, or null to fall back to Browser Run. */
export async function measureInOpenTab(
	env: Environment,
	board: ResolvedThumbnailBoard,
	userId: string,
	pageId: string,
	context: TabRenderContext
): Promise<Record<string, ShapeMeasurement> | null> {
	const result = await renderInOpenTab(env, board, userId, { mode: 'measure', pageId }, context)
	return result?.outcome === 'measured' ? readMeasurements(result.shapes) : null
}

/** A base64 PNG from the caller's open tab, or null to fall back to Browser Run. */
export async function captureInOpenTab(
	env: Environment,
	board: ResolvedThumbnailBoard,
	userId: string,
	capture: Omit<Extract<TabRenderRequest, { mode: 'screenshot' }>, 'mode'>,
	context: TabRenderContext
): Promise<string | null> {
	const result = await renderInOpenTab(
		env,
		board,
		userId,
		{ mode: 'screenshot', ...capture },
		context
	)
	return result?.outcome === 'captured' ? result.base64 : null
}

/**
 * A tab's reply to a job. Takes no sign-in: the job id is a random UUID that went to one
 * authenticated socket, so holding it already proves which tab this is, and it is dead within
 * seconds. Requiring a session token as well would add nothing, and would add a failure: a hidden
 * tab's Clerk token is routinely expired, and a reply stuck refreshing it loses to the ack window.
 */
export async function postTabRenderReply(request: IRequest, env: Environment): Promise<Response> {
	const { roomId, jobId } = request.params
	if (!roomId || !jobId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	const body = await request.text()
	if (body.length > MAX_TAB_RENDER_REPLY_LENGTH) {
		return Response.json({ error: true, message: 'Reply too large' }, { status: 413 })
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(body)
	} catch {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}
	const reply = parseTabRenderReply(parsed)
	if (!reply) {
		return Response.json({ error: true, message: 'Invalid reply' }, { status: 400 })
	}

	const received = await getRoomDurableObject(env, roomId).receiveTabRenderReply(jobId, reply)
	return received ? Response.json({ error: false }) : notFound()
}
