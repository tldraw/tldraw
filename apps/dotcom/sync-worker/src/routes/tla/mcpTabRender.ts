import {
	TAB_RENDER_DECLINE_REASONS,
	TabRenderReply,
	TabRenderRequest,
	TabRenderScreenshotRequest,
} from '@tldraw/dotcom-shared'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { TabRenderOutcome } from '../../tabRenderBroker'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { isFeatureFlagEnabledForUser } from '../../utils/featureFlags'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { getAuth } from '../../utils/tla/getAuth'
import { ShapeMeasurement } from './boardTools'
import { ResolvedThumbnailBoard, readMeasurements } from './thumbnailRender'
import { reportThumbnailError } from './thumbnailShared'

// The MCP side of rendering in an open tab. Any failure here means "use Browser Run", so a tool never
// answers worse than it would without this.
//
// **What a tab produces never reaches a shared cache.** Its owner can POST anything, and the `mcp/`
// PNG keys and the cluster index have no viewer dimension, so a forged answer would reach every other
// viewer's agent. See "Rendering in an open tab" in browser-run-thumbnails.md.

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
		const reason = result.status === 'declined' ? result.reason : 'none'
		writeTabRenderTelemetry(env, job.mode, result.status, reason, Date.now() - startedAt)
		return result
	} catch (error) {
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_tab_render',
			extras: { mode: job.mode },
		})
		writeTabRenderTelemetry(env, job.mode, 'error', 'none', Date.now() - startedAt)
		return null
	}
}

// Outcome and reason are closed vocabularies, with no board or user identity, like the rest of this
// pipeline.
function writeTabRenderTelemetry(
	env: Environment,
	mode: TabRenderRequest['mode'],
	outcome: string,
	reason: string,
	durationMs: number
) {
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_tab_render', {
		blobs: [`mode:${mode}`, `outcome:${outcome}`, `reason:${reason}`],
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
	return result?.status === 'measured' ? readMeasurements(result.shapes) : null
}

/** A base64 PNG from the caller's open tab, or null to fall back to Browser Run. */
export async function captureInOpenTab(
	env: Environment,
	board: ResolvedThumbnailBoard,
	userId: string,
	capture: Omit<TabRenderScreenshotRequest, 'mode'>,
	context: TabRenderContext
): Promise<string | null> {
	const result = await renderInOpenTab(
		env,
		board,
		userId,
		{ mode: 'screenshot', ...capture },
		context
	)
	return result?.status === 'captured' ? result.base64 : null
}

// In bytes, which also keeps the reply inside what one RPC can carry: a body this size serializes to
// well under the 32 MiB limit, whatever text it holds.
const MAX_TAB_RENDER_REPLY_BYTES = 16 * 1024 * 1024

const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// The base64 of the PNG signature, minus the trailing characters that also encode the bytes after it.
const PNG_BASE64_PREFIX = 'iVBORw0KGgo'

/** A reply off the wire, or null if it is not one. It comes from a client, so nothing is assumed. */
export function parseTabRenderReply(value: unknown): TabRenderReply | null {
	if (!value || typeof value !== 'object') return null
	const reply = value as Record<string, unknown>
	switch (reply.status) {
		case 'accepted':
			return { status: 'accepted' }
		case 'declined':
			return (TAB_RENDER_DECLINE_REASONS as readonly unknown[]).includes(reply.reason)
				? (reply as TabRenderReply)
				: null
		case 'measured':
			return reply.shapes && typeof reply.shapes === 'object' && !Array.isArray(reply.shapes)
				? (reply as TabRenderReply)
				: null
		case 'captured':
			return typeof reply.base64 === 'string' && reply.base64.startsWith(PNG_BASE64_PREFIX)
				? (reply as TabRenderReply)
				: null
		default:
			return null
	}
}

/**
 * A tab's reply to a job. Needs a website session for the user the job was made for, so a job id that
 * reaches anyone else, or one of the user's own agents, can't be used to answer it. The tab fetches a
 * fresh token for each reply, and a tab that can't get one doesn't answer, which falls back like any
 * other silent tab.
 *
 * The size is checked from the header, and the job before the body is read: without a live job id, a
 * request's bytes never reach the room's object, where enough of them at once could reset it and
 * disconnect everyone on the board.
 */
export async function postTabRenderReply(request: IRequest, env: Environment): Promise<Response> {
	const { roomId, jobId } = request.params
	if (!roomId || !jobId || !JOB_ID_PATTERN.test(jobId)) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	const length = Number(request.headers.get('content-length'))
	if (!length) return Response.json({ error: true, message: 'Length required' }, { status: 411 })
	if (length > MAX_TAB_RENDER_REPLY_BYTES) {
		return Response.json({ error: true, message: 'Reply too large' }, { status: 413 })
	}

	// Website sessions only: getAuth refuses an OAuth access token.
	const auth = await getAuth(request, env)
	if (!auth) return Response.json({ error: true, message: 'Unauthorized' }, { status: 401 })

	const room = getRoomDurableObject(env, roomId)
	if (!(await room.hasTabRenderJob(jobId, auth.userId))) return notFound()

	let parsed: unknown
	try {
		parsed = await request.json()
	} catch {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}
	const reply = parseTabRenderReply(parsed)
	if (!reply) {
		return Response.json({ error: true, message: 'Invalid reply' }, { status: 400 })
	}

	return (await room.receiveTabRenderReply(jobId, auth.userId, reply))
		? Response.json({ error: false })
		: notFound()
}
