import { ConnectStep, TLCustomServerEvent } from '@tldraw/dotcom-shared'

type StepFields = { [K in `d_${ConnectStep}` | `t_${ConnectStep}`]?: number }

/**
 * Server steps of one sync connect, echoed to the client as `d_<step>` (since the previous mark)
 * and `t_<step>` (since start). Deltas always sum to the last step's `t`, so charts can stack them.
 * Workers' Date.now() only advances across I/O, so CPU-only spans read ~0.
 */
export class ConnectMarks {
	private prev: number
	private readonly out: StepFields = {}

	constructor(
		private readonly start: number,
		private readonly now: () => number = Date.now
	) {
		this.prev = start
	}

	// Clamped because `start` can come from the worker's clock, not this machine's.
	mark(step: ConnectStep, at: number = this.now()) {
		const t = Math.max(at, this.prev)
		this.out[`d_${step}`] = Math.round(t - this.prev)
		this.out[`t_${step}`] = Math.round(t - this.start)
		this.prev = t
	}

	markAfter(step: ConnectStep, ms: number) {
		this.mark(step, Math.min(this.prev + ms, this.now()))
	}

	fields(): StepFields {
		return { ...this.out }
	}
}

/** A worker clock ahead of the room's would clamp every room-side mark before receivedAt to 0. */
export function connectStart(receivedAt: number | undefined, requestStart: number): number {
	return Math.min(receivedAt ?? requestStart, requestStart)
}

/** Marks route (and do_init, if this request woke the room) when the worker sent a receivedAt. */
export function markRoute(
	marks: ConnectMarks,
	receivedAt: number | undefined,
	constructedAt: number,
	requestStart: number
): void {
	if (receivedAt === undefined) return
	// The constructor ran for this request only if it ran after the worker received it.
	if (constructedAt >= receivedAt) {
		marks.mark('route', constructedAt)
		marks.mark('do_init', requestStart)
	} else {
		marks.mark('route', requestStart)
	}
}

export type ConnectEcho = Extract<TLCustomServerEvent, { type: 'first_load_server' }>
export type ConnectEchoBase = Pick<
	ConnectEcho,
	'loadId' | 'cold' | 'edge_colo' | 'do_colo' | 'pg_via' | 'boot_r2_ms' | 'boot_comments_ms'
>

export function buildConnectEcho(
	base: ConnectEchoBase,
	marks: ConnectMarks,
	connectBytes: number
): ConnectEcho {
	const defined = Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined))
	return {
		type: 'first_load_server',
		...(defined as ConnectEchoBase),
		connect_bytes: connectBytes,
		...marks.fields(),
	}
}
