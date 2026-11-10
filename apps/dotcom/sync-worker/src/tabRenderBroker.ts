import { TabRenderReply, TabRenderRequest } from '@tldraw/dotcom-shared'

// Runs an MCP tool's work in a user's open tldraw.com tab. Lives in the file's Durable Object, because
// that is where the sockets are; see "Working in an open tab" in browser-run-thumbnails.md.
//
// A tab can stop answering without its socket closing, so a job goes to all of a user's live tabs and
// the first answer wins.

/**
 * How long a tab has to acknowledge a job, which is how long a call waits on a tab that looks alive
 * but isn't. Spans a socket message, a worker hop and a DO hop, and a hidden tab's timers can be
 * throttled to once a second, so too short refuses live tabs.
 */
export const TAB_RENDER_ACK_TIMEOUT_MS = 1_500

/**
 * How long a job may wait for the room to boot. An idle tab lets the object hibernate, so the room
 * usually has to resume first, and a wedged boot would otherwise hang the tool call, which doesn't
 * depend on the room in any other way.
 */
export const TAB_RENDER_ROOM_TIMEOUT_MS = 1_500

/** How long work may run once the ack window closes. */
export const TAB_RENDER_WORK_TIMEOUT_MS = { read: 5_000, screenshot: 8_000 } as const

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
	| Extract<TabRenderReply, { status: 'page_read' | 'page_not_found' | 'captured' | 'declined' }>
	| { status: 'no_tab' | 'room_timeout' | 'ack_timeout' | 'work_timeout' }

export interface TabRenderSocket {
	sessionId: string
	userId: string | null
	/** When this socket last pinged, or connected if it hasn't pinged yet. */
	lastSeenAt: number
}

/**
 * The sessions worth sending one user's job to, most recently seen first. The caller decides how many
 * to ask.
 */
export function pickTabRenderSessions(
	sockets: TabRenderSocket[],
	userId: string,
	now: number
): string[] {
	const live = sockets
		.filter((s) => s.userId === userId && now - s.lastSeenAt <= TAB_RENDER_MAX_PING_AGE_MS)
		.sort((a, b) => b.lastSeenAt - a.lastSeenAt)
		.map((s) => s.sessionId)
	// A superseded socket for a session can linger, so sessions are deduped rather than sockets.
	return [...new Set(live)]
}

/** What a session's current socket says about it: the one the room would send a job to. */
export interface TabRenderTarget {
	userId: string | null
	canTabRender: boolean
}

/**
 * The picked sessions whose current socket can still take the job. Picking reads every socket,
 * superseded ones included, but the room sends to the newest socket for a session id. Without this, a
 * lingering socket that qualifies would hand the job id to a newer one that doesn't, such as an OAuth
 * client or another user connected under the same session id.
 */
export function keepDeliverableTabRenderSessions(
	sessionIds: string[],
	userId: string,
	currentTarget: (sessionId: string) => TabRenderTarget | null
): string[] {
	return sessionIds.filter((sessionId) => {
		const target = currentTarget(sessionId)
		return !!target?.canTabRender && target.userId === userId
	})
}

interface TabRenderJob {
	/**
	 * The tabs that can still answer, by job id. Each tab gets its own id, so a reply can only ever
	 * speak for the tab it was sent to.
	 */
	tabs: Map<string, 'asked' | 'working'>
	lastDecline?: Extract<TabRenderReply, { status: 'declined' }>
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
		return new Promise((resolve) => {
			const jobIds: string[] = []
			let workTimer: ReturnType<typeof setTimeout> | undefined
			const job: TabRenderJob = {
				tabs: new Map(),
				finish: (outcome) => {
					clearTimeout(ackTimer)
					clearTimeout(workTimer)
					for (const jobId of jobIds) this.jobs.delete(jobId)
					resolve(outcome)
				},
			}
			const ackTimer = setTimeout(() => {
				for (const [jobId, state] of job.tabs) {
					if (state === 'asked') this.forgetTab(job, jobId)
				}
				if (job.tabs.size === 0) {
					job.finish(job.lastDecline ?? { status: 'ack_timeout' })
					return
				}
				workTimer = setTimeout(
					() => job.finish({ status: 'work_timeout' }),
					TAB_RENDER_WORK_TIMEOUT_MS[request.mode]
				)
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

	private forgetTab(job: TabRenderJob, jobId: string) {
		job.tabs.delete(jobId)
		this.jobs.delete(jobId)
	}

	/** Whether this job id can still be answered. False once the job finishes. */
	has(jobId: string) {
		return this.jobs.has(jobId)
	}

	/** Whether the reply landed. False for an unknown job id, including one that already finished. */
	receive(jobId: string, reply: TabRenderReply): boolean {
		const job = this.jobs.get(jobId)
		if (!job) return false

		switch (reply.status) {
			case 'accepted':
				job.tabs.set(jobId, 'working')
				break
			case 'declined':
				this.forgetTab(job, jobId)
				job.lastDecline = reply
				if (job.tabs.size === 0) job.finish(reply)
				break
			default:
				job.finish(reply)
		}
		return true
	}
}
