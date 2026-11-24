import { TabRenderReply, TabRenderRequest } from '@tldraw/dotcom-shared'

// Runs an MCP tool's work in a user's open tldraw.com tab. Lives in the file's Durable Object, because
// that is where the sockets are; see "Working in an open tab" and "Editing in an open tab" in
// browser-run-thumbnails.md.
//
// A tab can stop answering without its socket closing, so a read goes to several of a user's live tabs
// and the first answer wins. A write goes to one, and that tab waits for the 200 on its acknowledgement
// before applying anything, which is what stops a frozen tab replaying a job when it wakes.

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

/**
 * How long work may run once the ack window closes. A batch of ops gets the longest: it stalls a real
 * tab for longer than an export, and a timeout on a write can't say whether the write landed.
 */
export const TAB_RENDER_WORK_TIMEOUT_MS = {
	read: 5_000,
	screenshot: 8_000,
	apply_ops: 10_000,
	user_state: 3_000,
} as const

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
	| Extract<
			TabRenderReply,
			{
				status: 'page_read' | 'page_not_found' | 'captured' | 'applied' | 'user_state' | 'declined'
			}
	  >
	| {
			status:
				| 'no_tab'
				| 'tab_suspended'
				| 'reload_needed'
				| 'room_timeout'
				| 'ack_timeout'
				| 'work_timeout'
	  }

/**
 * Where a job's time went, for telemetry: a slow room and a slow tab are different problems and one
 * duration can't tell them apart. -1 marks a stage the job never reached.
 */
export interface TabRenderStats {
	/** Tabs the job was sent to. */
	tabs: number
	/** Waiting for the room to boot. */
	roomMs: number
	/** From sending the job to the first reply of any kind from a tab. */
	ackMs: number
}

export type TabRenderResponse = TabRenderOutcome & { stats?: TabRenderStats }

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

/**
 * Which of the deliverable sessions a job goes to. "The user's selection" and "the page they're on"
 * mean the tab they're in, and a write must run once, so those go to the one tab the user was last
 * active in. Reads go to several, where any answer will do and a second tab can cover for a dead one.
 */
/**
 * How long the file object remembers a keyed batch once it knows the batch landed. A resend comes
 * moments after the attempt it repeats.
 */
export const BATCH_CLAIM_TTL_MS = 24 * 60 * 60 * 1000

// A cached result bigger than this is dropped and the resend told only that the batch landed: the
// object's storage caps a value, and a thousand-op result can approach it.
const MAX_CACHED_RESULT_LENGTH = 100_000

export const BATCH_CLAIM_PREFIX = 'batchClaim:'

/** The storage key for a user's batch key. JSON, so a ':' in either part can't make two collide. */
export function batchClaimStorageKey(userId: string, batchKey: string) {
	return BATCH_CLAIM_PREFIX + JSON.stringify([userId, batchKey])
}

/**
 * A keyed batch's one attempt, kept in the file object's storage. It is written before any tab may
 * run the batch, and the batch isn't sent to a tab again while the attempt is unresolved: an attempt
 * the server hasn't confirmed may still be in its tab, which pushes it on reconnect, however late, so
 * a second attempt could land it twice.
 */
export interface BatchClaim {
	/** The ops and page the key was used for. */
	opsHash: string
	/** The session the attempt went to. */
	sessionId: string
	/** The `document.meta` entry the tab writes with the batch; cleared when the claim expires. */
	metaEntry: string
	at: number
	/** When the file object learned the batch landed. Unresolved claims never expire. */
	resolvedAt?: number
	/** The attempt's result, if its tab reported it applied. */
	applied?: Extract<TabRenderOutcome, { status: 'applied' }>
}

/** What to do with a batch whose key has a claim. */
export type ClaimedBatchPlan =
	| { kind: 'answer'; outcome: TabRenderOutcome }
	/** The claim expired: run the batch as new. */
	| { kind: 'run' }
	/**
	 * The attempt is unresolved: ask its tab, the one place an unconfirmed copy can be, which knows
	 * from its own store whether it holds the batch. Nobody else may run it.
	 */
	| { kind: 'ask_claimant'; sessionId: string }

/** `landed` says whether the key is in the room's document, which the tab writes with the batch. */
export function planClaimedBatch(
	claim: BatchClaim,
	opsHash: string,
	landed: boolean,
	now: number
): ClaimedBatchPlan {
	if (isExpiredBatchClaim(claim, now)) return { kind: 'run' }
	if (claim.opsHash !== opsHash) {
		return { kind: 'answer', outcome: { status: 'declined', reason: 'batch_key_reused' } }
	}
	if (claim.applied) return { kind: 'answer', outcome: claim.applied }
	if (claim.resolvedAt !== undefined || landed) {
		return { kind: 'answer', outcome: { status: 'declined', reason: 'already_applied' } }
	}
	return { kind: 'ask_claimant', sessionId: claim.sessionId }
}

/**
 * The claim to keep after a tab ran or was asked about the batch, or null to free the key. A first
 * attempt that applied nothing frees it. A resend to the claimant never does: a claimant that
 * declines before checking its store, say mid-drag, may still hold the first attempt.
 */
export function batchClaimAfter(
	claim: BatchClaim,
	outcome: TabRenderOutcome,
	{ resend, now }: { resend: boolean; now: number }
): BatchClaim | null {
	if (outcome.status === 'applied') {
		return JSON.stringify(outcome).length <= MAX_CACHED_RESULT_LENGTH
			? { ...claim, resolvedAt: now, applied: outcome }
			: { ...claim, resolvedAt: now }
	}
	if (outcome.status === 'declined' && outcome.reason === 'already_applied') {
		return { ...claim, resolvedAt: now }
	}
	const mayHaveLanded =
		outcome.status === 'work_timeout' ||
		(outcome.status === 'declined' &&
			(outcome.reason === 'unconfirmed' || outcome.reason === 'apply_failed'))
	return mayHaveLanded || resend ? claim : null
}

/** Claims the file object can drop: only resolved ones, a day after. */
export function isExpiredBatchClaim(claim: BatchClaim, now: number) {
	return claim.resolvedAt !== undefined && now - claim.resolvedAt >= BATCH_CLAIM_TTL_MS
}

export function pickTabRenderTargets(
	mode: TabRenderRequest['mode'],
	sessionIds: string[],
	lastActiveAt: (sessionId: string) => number
): string[] {
	if (mode === 'apply_ops' || mode === 'user_state') {
		return [...sessionIds].sort((a, b) => lastActiveAt(b) - lastActiveAt(a)).slice(0, 1)
	}
	return sessionIds.slice(0, MAX_TAB_RENDER_SESSIONS)
}

interface TabRenderJob {
	/**
	 * The tabs that can still answer, by job id. Each tab gets its own id, so a reply can only ever
	 * speak for the tab it was sent to.
	 */
	tabs: Map<string, 'asked' | 'working'>
	lastDecline?: Extract<TabRenderReply, { status: 'declined' }>
	onFirstReply?(): void
	finish(outcome: TabRenderOutcome): void
}

export class TabRenderBroker {
	private readonly jobs = new Map<string, TabRenderJob>()

	/**
	 * Resolves once a tab answers, or as soon as none of them can. Each session takes the next of
	 * `jobIds`, which the worker minted and signed: see tabRenderJobIds.ts.
	 */
	dispatch(
		sessionIds: string[],
		request: TabRenderRequest,
		jobIds: readonly string[],
		send: (sessionId: string, jobId: string) => void,
		onFirstReply?: () => void
	): Promise<TabRenderOutcome> {
		return new Promise((resolve) => {
			const issued: string[] = []
			let workTimer: ReturnType<typeof setTimeout> | undefined
			const job: TabRenderJob = {
				tabs: new Map(),
				onFirstReply,
				finish: (outcome) => {
					clearTimeout(ackTimer)
					clearTimeout(workTimer)
					for (const jobId of issued) this.jobs.delete(jobId)
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

			sessionIds.forEach((sessionId, i) => {
				const jobId = jobIds[i]
				issued.push(jobId)
				job.tabs.set(jobId, 'asked')
				this.jobs.set(jobId, job)
				send(sessionId, jobId)
			})
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
		job.onFirstReply?.()
		job.onFirstReply = undefined

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
