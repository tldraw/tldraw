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
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { PageSelector, ResolvedPage, ShapeMeasurement } from './boardTools'
import { readMeasurements } from './thumbnailRender'
import { reportThumbnailError } from './thumbnailShared'

// The MCP side of working in an open tab, which is the only way these tools read a page, measure it
// or capture it: anything a tab can't do comes back as a message telling the agent what the user
// needs to do.
//
// **What a tab produces never reaches a shared cache.** Its owner can POST anything, so a forged
// answer must only ever reach that owner's own agent. See "Working in an open tab" in
// browser-run-thumbnails.md.

interface TabRenderContext {
	request: Request
	ctx: ExecutionContext | undefined
}

/** What a tab produced, or a message for the model and a bounded code for telemetry. */
export type TabRenderResult<T> =
	| { ok: true; value: T }
	| { ok: false; message: string; reason: string }

async function runInOpenTab<S extends TabRenderOutcome['status']>(
	env: Environment,
	fileId: string,
	userId: string,
	job: TabRenderRequest,
	expected: S,
	{ request, ctx }: TabRenderContext
): Promise<TabRenderResult<Extract<TabRenderOutcome, { status: S }>>> {
	const startedAt = Date.now()
	let result: TabRenderOutcome | { status: 'error' }
	try {
		result = await getRoomDurableObject(env, fileId).requestTabRender(userId, job)
		const reason = result.status === 'declined' ? result.reason : 'none'
		writeTabRenderTelemetry(env, job.mode, result.status, reason, Date.now() - startedAt)
	} catch (error) {
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_tab_render',
			extras: { mode: job.mode },
		})
		writeTabRenderTelemetry(env, job.mode, 'error', 'none', Date.now() - startedAt)
		result = { status: 'error' }
	}
	if (result.status === expected) {
		return { ok: true, value: result as Extract<TabRenderOutcome, { status: S }> }
	}
	return { ok: false, ...describeFailure(result, boardUrlOf(env, request, fileId)) }
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

const DECLINE_MESSAGES: Record<(typeof TAB_RENDER_DECLINE_REASONS)[number], string> = {
	editor_not_ready: 'The board is still loading in the browser tab. Try again in a moment.',
	page_missing:
		'The browser tab does not have that page. Call get_board_info to list the pages, or try again in a moment if it was only just added.',
	page_not_current:
		'The browser tab is showing a different page, and this only works on the page in view. Ask the user to switch to that page, then try again.',
	shapes_missing:
		'Those shapes are no longer on the page. Call get_page_info for the current clusters.',
	too_many_shapes:
		'That is too many shapes to capture at once without interrupting the user. Ask for fewer clusters.',
	busy: 'The user is busy in the browser tab. Try again in a moment.',
	export_timed_out:
		'The picture took too long to draw, usually while images load. Try again in a moment.',
	failed: 'The browser tab could not do that. Try again in a moment.',
}

function describeFailure(
	result: TabRenderOutcome | { status: 'error' },
	boardUrl: string
): { message: string; reason: string } {
	const notResponding = `The browser tab for this board is not responding, so nothing was done. Ask the user to bring ${boardUrl} to the front, then try again.`
	switch (result.status) {
		case 'declined':
			return { message: DECLINE_MESSAGES[result.reason], reason: `tab_${result.reason}` }
		case 'no_tab':
			return {
				message: `This board is not open in a browser tab, and this tool works through the user's open tab. Ask the user to open ${boardUrl} and keep it open, then try again.`,
				reason: 'tab_not_open',
			}
		case 'room_timeout':
		case 'ack_timeout':
			return { message: notResponding, reason: `tab_${result.status}` }
		case 'error':
		case 'work_timeout':
			return {
				message:
					result.status === 'error'
						? notResponding
						: 'The browser tab took too long. Try again in a moment.',
				reason: `tab_${result.status}`,
			}
		// A reply of the wrong kind for the job, which only a tab that isn't ours would send.
		default:
			return { message: DECLINE_MESSAGES.failed, reason: 'tab_failed' }
	}
}

function boardUrlOf(env: Environment, request: Request, fileId: string) {
	return `${getPublicOrigin(request as IRequest, env)}/f/${fileId}`
}

/**
 * Why a tool can't work on a published board. It is the frozen copy made when it was published, the
 * room behind it holds the live file, which is a different document, and nobody viewing the published
 * page is in that room.
 */
export const PUBLISHED_BOARD_FAILURE = {
	ok: false,
	message:
		'This tool works through an open browser tab of the board, which a published board does not have. Only get_board_info works on published boards for now.',
	reason: 'tab_published_board',
} as const

/** As the room holds it now, rather than the persisted copy, which lags it by up to 8s. */
export async function readLivePage(
	env: Environment,
	fileId: string,
	userId: string,
	page: PageSelector,
	{ request, ctx }: TabRenderContext
): Promise<TabRenderResult<ResolvedPage>> {
	let result: Awaited<ReturnType<ReturnType<typeof getRoomDurableObject>['getMcpLivePage']>>
	try {
		result = await getRoomDurableObject(env, fileId).getMcpLivePage(userId, page)
	} catch (error) {
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_tab_render',
			extras: { mode: 'live_page' },
		})
		return { ok: false, ...describeFailure({ status: 'error' }, boardUrlOf(env, request, fileId)) }
	}
	if (result.status === 'ok') return { ok: true, value: result.page }
	return { ok: false, ...describeFailure(result, boardUrlOf(env, request, fileId)) }
}

export async function measureInOpenTab(
	env: Environment,
	fileId: string,
	userId: string,
	pageId: string,
	context: TabRenderContext
): Promise<TabRenderResult<Record<string, ShapeMeasurement>>> {
	const job: TabRenderRequest = { mode: 'measure', pageId }
	const result = await runInOpenTab(env, fileId, userId, job, 'measured', context)
	return result.ok ? { ok: true, value: readMeasurements(result.value.shapes) } : result
}

export async function captureInOpenTab(
	env: Environment,
	fileId: string,
	userId: string,
	capture: Omit<TabRenderScreenshotRequest, 'mode'>,
	context: TabRenderContext
): Promise<TabRenderResult<string>> {
	const job: TabRenderRequest = { mode: 'screenshot', ...capture }
	const result = await runInOpenTab(env, fileId, userId, job, 'captured', context)
	return result.ok ? { ok: true, value: result.value.base64 } : result
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
 * A tab's reply to a job. Takes no sign-in: the job id is the capability, a random UUID sent to one
 * tab's socket and dead once the job ends. A session token made a hidden tab miss the ack window,
 * because its Clerk token is routinely expired and refreshing it takes longer than the window.
 *
 * Anyone can reach this, so the size is checked from the header and the job before the body is read:
 * without a live job id, a request's bytes never reach the room's object, where enough of them at once
 * could reset it and disconnect everyone on the board.
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

	const room = getRoomDurableObject(env, roomId)
	if (!(await room.hasTabRenderJob(jobId))) return notFound()

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

	return (await room.receiveTabRenderReply(jobId, reply))
		? Response.json({ error: false })
		: notFound()
}
