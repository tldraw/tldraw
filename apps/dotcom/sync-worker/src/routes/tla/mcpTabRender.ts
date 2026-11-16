import {
	McpPageLookup,
	McpPageRead,
	TAB_RENDER_DECLINE_REASONS,
	TabRenderApplyOpsRequest,
	TabRenderReply,
	TabRenderRequest,
	TabRenderScreenshotRequest,
} from '@tldraw/dotcom-shared'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { MAX_TAB_RENDER_SESSIONS, TabRenderOutcome } from '../../tabRenderBroker'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { isTabRenderJobIdFor, mintTabRenderJobIds } from '../../utils/tabRenderJobIds'
import { PageSelector, getBoardUsers } from './boardTools'
import { reportThumbnailError } from './thumbnailShared'

// The MCP side of working in an open tab, which is the only way these tools read a page, measure it,
// capture it or edit it: anything a tab can't do comes back as a message telling the agent what the
// user needs to do.
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
	expected: readonly S[],
	{ request, ctx }: TabRenderContext
): Promise<TabRenderResult<Extract<TabRenderOutcome, { status: S }>>> {
	const startedAt = Date.now()
	let result: TabRenderOutcome | { status: 'error' }
	try {
		const jobIds = await mintTabRenderJobIds(env, fileId, MAX_TAB_RENDER_SESSIONS)
		result = await getRoomDurableObject(env, fileId).requestTabRender(userId, job, jobIds)
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
	if ((expected as readonly string[]).includes(result.status)) {
		return { ok: true, value: result as Extract<TabRenderOutcome, { status: S }> }
	}
	return { ok: false, ...describeFailure(result, job.mode, boardUrlOf(env, request, fileId)) }
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
	invalid_ops: 'The batch is invalid and nothing was applied.',
	read_only: 'You have view-only access to this board, so it cannot be edited.',
	tab_hidden:
		'The board is open, but not in the tab the user is looking at, so nothing was done. Ask the user to switch to the board, then try again.',
	apply_failed:
		'The browser tab hit an error partway through, so these ops may or may not have applied. Check the board before sending them again.',
	failed: 'The browser tab could not do that. Try again in a moment.',
}

function describeFailure(
	result: TabRenderOutcome | { status: 'error' },
	mode: TabRenderRequest['mode'] | null,
	boardUrl: string
): { message: string; reason: string } {
	switch (result.status) {
		case 'declined': {
			const message = DECLINE_MESSAGES[result.reason]
			return {
				message: result.detail ? `${message} ${result.detail}` : message,
				reason: `tab_${result.reason}`,
			}
		}
		case 'no_tab':
			return {
				message: `This board is not open in a browser tab, and this tool works through the user's open tab. Ask the user to open ${boardUrl} and keep it open, then try again.`,
				reason: 'tab_not_open',
			}
		case 'reload_needed':
			return {
				message:
					'The board is open, but the tab connected before you could edit it, so nothing was done. Ask the user to reload the tab, then try again.',
				reason: 'tab_reload_needed',
			}
		case 'ack_timeout':
			return {
				message: `The browser tab for this board is not responding, so nothing was done. Ask the user to bring ${boardUrl} to the front, then try again.`,
				reason: 'tab_ack_timeout',
			}
		case 'work_timeout':
			if (mode === 'apply_ops') return mayHaveApplied(result.status)
			return {
				message: 'The browser tab took too long. Try again in a moment.',
				reason: 'tab_work_timeout',
			}
		// The room or the worker failed rather than the tab, so there is nothing for the user to do.
		case 'room_timeout':
			return { message: NOT_REACHED_MESSAGE, reason: 'tab_room_timeout' }
		case 'error':
			if (mode === 'apply_ops') return mayHaveApplied(result.status)
			return { message: NOT_REACHED_MESSAGE, reason: 'tab_error' }
		// A reply of the wrong kind for the job, which only a tab that isn't ours would send.
		default:
			return { message: DECLINE_MESSAGES.failed, reason: 'tab_failed' }
	}
}

const NOT_REACHED_MESSAGE = 'The board could not be reached. Try again in a moment.'

// A timeout or a failure can come after a tab claimed a write, so the batch may well have landed, and
// telling the agent nothing happened is how it lands twice.
function mayHaveApplied(status: string) {
	return {
		message:
			'The browser tab did not report back, so these ops may or may not have applied. Check the board before sending them again.',
		reason: `tab_${status}`,
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

/** A page as the caller's open tab read it, or why its `page` names none. */
export type TabPageRead =
	| { found: true; read: McpPageRead }
	| { found: false; lookup: Extract<McpPageLookup, { ok: false }> }

/**
 * Reads a page in the caller's open tab: the tab resolves `page`, measures and clusters it, and sends
 * back records only for `clusterIds`. The board's room only relays the job, so a read never makes it
 * serialize the document, which blocked everyone on the board while it ran.
 */
export async function readPageInOpenTab(
	env: Environment,
	fileId: string,
	userId: string,
	page: PageSelector,
	clusterIds: string[],
	context: TabRenderContext
): Promise<TabRenderResult<TabPageRead>> {
	const job: TabRenderRequest = { mode: 'read', page, clusterIds }
	const result = await runInOpenTab(
		env,
		fileId,
		userId,
		job,
		['page_read', 'page_not_found'] as const,
		context
	)
	if (!result.ok) return result
	const reply = result.value
	return {
		ok: true,
		value:
			reply.status === 'page_read'
				? { found: true, read: reply.read }
				: { found: false, lookup: { ok: false, reason: reply.reason, pageCount: reply.pageCount } },
	}
}

export async function captureInOpenTab(
	env: Environment,
	fileId: string,
	userId: string,
	capture: Omit<TabRenderScreenshotRequest, 'mode'>,
	context: TabRenderContext
): Promise<TabRenderResult<string>> {
	const job: TabRenderRequest = { mode: 'screenshot', ...capture }
	const result = await runInOpenTab(env, fileId, userId, job, ['captured'] as const, context)
	return result.ok ? { ok: true, value: result.value.base64 } : result
}

/**
 * Not from presence: a hibernating room clears selections to fit its socket attachments, and "change
 * what I selected" usually comes after a pause.
 */
export function readUserStateInOpenTab(
	env: Environment,
	fileId: string,
	userId: string,
	context: TabRenderContext
) {
	return runInOpenTab(env, fileId, userId, { mode: 'user_state' }, ['user_state'] as const, context)
}

export function applyOpsInOpenTab(
	env: Environment,
	fileId: string,
	userId: string,
	apply: Omit<TabRenderApplyOpsRequest, 'mode'>,
	context: TabRenderContext
) {
	const job: TabRenderRequest = { mode: 'apply_ops', ...apply }
	return runInOpenTab(env, fileId, userId, job, ['applied'] as const, context)
}

export async function readBoardUsers(
	env: Environment,
	fileId: string,
	{ request }: TabRenderContext
): Promise<TabRenderResult<ReturnType<typeof getBoardUsers>>> {
	const result = await getRoomDurableObject(env, fileId).getMcpBoardUsers()
	if (result.status === 'room_timeout') {
		return { ok: false, ...describeFailure(result, null, boardUrlOf(env, request, fileId)) }
	}
	const { users, anonymousViewers } = result
	return { ok: true, value: { users, anonymousViewers } }
}

// In bytes, which also keeps the reply inside what one RPC can carry: a body this size serializes to
// well under the 32 MiB limit, whatever text it holds.
const MAX_TAB_RENDER_REPLY_BYTES = 16 * 1024 * 1024

// The base64 of the PNG signature, minus the trailing characters that also encode the bytes after it.
const PNG_BASE64_PREFIX = 'iVBORw0KGgo'

const MAX_DECLINE_DETAIL_LENGTH = 2_000

function isStringArray(value: unknown) {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isBox(value: unknown) {
	if (!value || typeof value !== 'object') return false
	const { x, y, w, h } = value as Record<string, unknown>
	return [x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))
}

/** A reply off the wire, or null if it is not one. It comes from a client, so nothing is assumed. */
export function parseTabRenderReply(value: unknown): TabRenderReply | null {
	if (!value || typeof value !== 'object') return null
	const reply = value as Record<string, unknown>
	switch (reply.status) {
		case 'accepted':
			return { status: 'accepted' }
		case 'declined': {
			if (!(TAB_RENDER_DECLINE_REASONS as readonly unknown[]).includes(reply.reason)) return null
			if (reply.detail !== undefined && typeof reply.detail !== 'string') return null
			if ((reply.detail?.length ?? 0) > MAX_DECLINE_DETAIL_LENGTH) return null
			return reply as TabRenderReply
		}
		case 'page_read':
			return isPageRead(reply.read) ? (reply as TabRenderReply) : null
		case 'page_not_found':
			return (reply.reason === 'no_pages' || reply.reason === 'page_out_of_range') &&
				Number.isInteger(reply.pageCount) &&
				(reply.pageCount as number) >= 0
				? (reply as TabRenderReply)
				: null
		case 'captured':
			return typeof reply.base64 === 'string' && reply.base64.startsWith(PNG_BASE64_PREFIX)
				? (reply as TabRenderReply)
				: null
		case 'user_state':
			return typeof reply.pageId === 'string' &&
				typeof reply.pageName === 'string' &&
				isStringArray(reply.selectedShapeIds) &&
				isBox(reply.viewport)
				? (reply as TabRenderReply)
				: null
		case 'applied':
			return typeof reply.pageId === 'string' &&
				typeof reply.pageName === 'string' &&
				reply.result &&
				typeof reply.result === 'object' &&
				!Array.isArray(reply.result)
				? (reply as TabRenderReply)
				: null
		default:
			return null
	}
}

// Checks the shape the tool code walks, so a malformed read fails here as an invalid reply rather than
// as a throw halfway through an answer. The values are the caller's own tab's word: a forged one only
// ever reaches that caller's agent.
function isPageRead(value: unknown): value is McpPageRead {
	if (!value || typeof value !== 'object') return false
	const read = value as Record<string, unknown>
	return (
		typeof read.pageId === 'string' &&
		typeof read.pageName === 'string' &&
		Array.isArray(read.clusters) &&
		read.clusters.every(isClusterSummary) &&
		Array.isArray(read.details) &&
		read.details.every(isClusterDetail) &&
		(read.detailBounds === undefined ||
			(isPlainObject(read.detailBounds) &&
				Object.values(read.detailBounds as object).every(isBox))) &&
		Array.isArray(read.ancestors) &&
		read.ancestors.every(isShapeLike) &&
		Array.isArray(read.bindings) &&
		read.bindings.every((b) => !!b && typeof b === 'object') &&
		isPlainObject(read.arrows) &&
		isPlainObject(read.dimensions)
	)
}

function isClusterSummary(value: unknown) {
	if (!value || typeof value !== 'object') return false
	const c = value as Record<string, unknown>
	return (
		typeof c.id === 'string' &&
		typeof c.label === 'string' &&
		Array.isArray(c.keywords) &&
		c.keywords.every((k) => typeof k === 'string') &&
		Number.isInteger(c.numberOfShapes) &&
		(c.bounds === null || isBox(c.bounds))
	)
}

function isClusterDetail(value: unknown) {
	if (!value || typeof value !== 'object') return false
	const c = value as Record<string, unknown>
	return (
		typeof c.id === 'string' &&
		typeof c.label === 'string' &&
		Array.isArray(c.keywords) &&
		Number.isInteger(c.numberOfShapes) &&
		Array.isArray(c.shapes) &&
		c.shapes.every(isShapeLike)
	)
}

function isShapeLike(value: unknown) {
	if (!value || typeof value !== 'object') return false
	const shape = value as Record<string, unknown>
	return (
		typeof shape.id === 'string' &&
		typeof shape.type === 'string' &&
		typeof shape.parentId === 'string' &&
		isPlainObject(shape.props)
	)
}

function isPlainObject(value: unknown) {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * A tab's reply to a job. Takes no sign-in: the job id is the capability, a signed nonce sent to one
 * tab's socket and dead once the job ends. A session token made an idle tab miss the ack window: its
 * Clerk token had usually expired, and refreshing it took longer than the window.
 *
 * For a write, the 200 on `accepted` is the go-ahead, and a 404 stands down a tab that woke after the
 * job ended.
 *
 * Anyone can reach this, so the size is checked from the header and the job before the body is read:
 * without a live job id, a request's bytes never reach the room's object, where enough of them at once
 * could reset it and disconnect everyone on the board.
 */
export async function postTabRenderReply(request: IRequest, env: Environment): Promise<Response> {
	const { roomId, jobId } = request.params
	if (!roomId || !jobId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()
	// Before anything reaches the room's object, so a made-up room id and job id can't wake it.
	if (!(await isTabRenderJobIdFor(env, roomId, jobId))) return notFound()

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
