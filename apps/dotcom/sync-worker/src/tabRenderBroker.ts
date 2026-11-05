import { TAB_RENDER_DECLINE_REASONS, TabRenderReply, TabRenderRequest } from '@tldraw/dotcom-shared'

// Lets an MCP tool borrow a user's open tldraw.com tab instead of starting a Browser Run session.
// Lives in the file's Durable Object, because that is where the sockets are; see "Rendering in an
// open tab" in browser-run-thumbnails.md for why it is shaped like this.
//
// A job goes to each of the user's live tabs at once and the first answer wins. A tab can stop being
// able to answer without its socket closing — a laptop lid, a frozen background tab — so a job never
// waits on one tab being healthy. The ack window is what bounds that: a tab that can answer says so
// straight away, so the only price of a dead tab is the window, not the whole work timeout.

/**
 * How long a tab has to acknowledge a job, and the whole price of a tab that looks alive but isn't.
 * Spans a socket message, a worker hop and a DO hop, and a hidden tab's timers can be throttled to
 * once a second. Too short and live tabs lose to Browser Run; too long and a dead one taxes every
 * fallback.
 */
export const TAB_RENDER_ACK_TIMEOUT_MS = 1_500

/**
 * How long acknowledged work may run. Both sit well under a Browser Run session, since a timeout here
 * is paid on top of the fallback: past this, the fallback would likely have been faster.
 */
export const TAB_RENDER_WORK_TIMEOUT_MS = { measure: 5_000, screenshot: 8_000 } as const

/**
 * The most tabs one job goes to. Every addressed tab does the work, so this bounds what a single
 * call can cost a user who has left many copies of a board open.
 */
export const MAX_TAB_RENDER_SESSIONS = 3

/**
 * How recently a socket must have pinged to be worth asking. The sync client pings every 5s, but a
 * hidden tab's timers can drop to once a minute, so this has to clear that. It catches the common
 * dead tab, a sleeping laptop, without spending the ack window on it.
 */
export const TAB_RENDER_MAX_PING_AGE_MS = 90_000

export type TabRenderOutcome =
	| { outcome: 'measured'; shapes: Record<string, unknown> }
	| { outcome: 'captured'; base64: string }
	| { outcome: 'no_tab' }
	| { outcome: 'declined'; reason: string }
	| { outcome: 'ack_timeout' }
	| { outcome: 'work_timeout' }

export interface TabRenderSocket {
	sessionId: string
	userId: string | null
	canRender: boolean
	/** When this socket last pinged, or null if it hasn't since connecting. */
	lastPingAt: number | null
}

/** The sessions worth sending one user's job to, most recently pinged first. */
export function pickTabRenderSessions(
	sockets: TabRenderSocket[],
	userId: string,
	now: number
): string[] {
	// A superseded socket for a session can linger, so sessions are deduped rather than sockets.
	const lastPingBySession = new Map<string, number>()
	for (const socket of sockets) {
		if (!socket.canRender || socket.userId !== userId) continue
		// Null is a socket too new to have pinged, which is the opposite of dead.
		const lastPingAt = socket.lastPingAt ?? now
		if (now - lastPingAt > TAB_RENDER_MAX_PING_AGE_MS) continue
		const known = lastPingBySession.get(socket.sessionId)
		if (known === undefined || lastPingAt > known) {
			lastPingBySession.set(socket.sessionId, lastPingAt)
		}
	}
	return [...lastPingBySession.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, MAX_TAB_RENDER_SESSIONS)
		.map(([sessionId]) => sessionId)
}

type TabState = 'asked' | 'working' | 'declined'

interface TabRenderJob {
	/** By job id: each tab gets its own, so a reply can only ever speak for the tab it was sent to. */
	tabs: Map<string, TabState>
	ackWindowOpen: boolean
	lastDeclineReason: string
	finish(outcome: TabRenderOutcome): void
}

export class TabRenderBroker {
	private readonly jobs = new Map<string, TabRenderJob>()

	/** Resolves once a tab answers, or as soon as none of them can. */
	dispatch(
		sessionIds: string[],
		request: TabRenderRequest,
		send: (sessionId: string, jobId: string) => void
	): Promise<TabRenderOutcome> {
		if (sessionIds.length === 0) return Promise.resolve({ outcome: 'no_tab' })

		return new Promise((resolve) => {
			const jobIds: string[] = []
			let workTimer: ReturnType<typeof setTimeout> | undefined
			const job: TabRenderJob = {
				tabs: new Map(),
				ackWindowOpen: true,
				lastDeclineReason: 'failed',
				finish: (outcome) => {
					clearTimeout(ackTimer)
					clearTimeout(workTimer)
					for (const jobId of jobIds) this.jobs.delete(jobId)
					resolve(outcome)
				},
			}
			const startWorkTimer = () => {
				workTimer = setTimeout(
					() => job.finish({ outcome: 'work_timeout' }),
					TAB_RENDER_WORK_TIMEOUT_MS[request.mode]
				)
			}
			const ackTimer = setTimeout(() => {
				job.ackWindowOpen = false
				const tabs = [...job.tabs.values()]
				if (tabs.includes('working')) {
					startWorkTimer()
				} else if (tabs.includes('declined')) {
					job.finish({ outcome: 'declined', reason: job.lastDeclineReason })
				} else {
					job.finish({ outcome: 'ack_timeout' })
				}
			}, TAB_RENDER_ACK_TIMEOUT_MS)

			for (const sessionId of sessionIds) {
				const jobId = crypto.randomUUID()
				jobIds.push(jobId)
				job.tabs.set(jobId, 'asked')
				this.jobs.set(jobId, job)
				send(sessionId, jobId)
			}
		})
	}

	/** Whether the reply landed. False for an unknown job id, including one that already finished. */
	receive(jobId: string, reply: TabRenderReply): boolean {
		const job = this.jobs.get(jobId)
		if (!job || job.tabs.get(jobId) === 'declined') return false

		switch (reply.status) {
			case 'accepted':
				job.tabs.set(jobId, 'working')
				return true
			case 'declined': {
				job.tabs.set(jobId, 'declined')
				job.lastDeclineReason = reply.reason
				const tabs = [...job.tabs.values()]
				// Tabs still in `asked` only count while they could yet acknowledge.
				const stillPossible =
					tabs.includes('working') || (job.ackWindowOpen && tabs.includes('asked'))
				if (!stillPossible) job.finish({ outcome: 'declined', reason: reply.reason })
				return true
			}
			case 'measured':
				job.finish({ outcome: 'measured', shapes: reply.shapes })
				return true
			case 'captured':
				job.finish({ outcome: 'captured', base64: reply.base64 })
				return true
		}
	}
}

// Plenty for a 1200x630 PNG, and the same bound keeps a measure of a very large page inside what a
// single RPC can carry.
export const MAX_TAB_RENDER_REPLY_LENGTH = 16 * 1024 * 1024

// The base64 of the eight byte PNG signature, minus the trailing characters that also encode the
// bytes after it.
const PNG_BASE64_PREFIX = 'iVBORw0KGgo'

/** A reply off the wire, or null if it is not one. The body comes from a client, so nothing is assumed. */
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
