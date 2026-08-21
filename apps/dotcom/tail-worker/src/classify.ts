/// <reference types="@cloudflare/workers-types" />

interface AnyEventInfo {
	cron?: string
	scheduledTime?: number | Date
	getWebSocketEvent?: { webSocketEventType: string }
	rpcMethod?: string
	queue?: string
	request?: { method: string; url: string }
}

const WS_EVENT_KINDS = new Set(['message', 'close', 'error'])

export function classifyHandler(item: TraceItem): string {
	const ev = item.event as AnyEventInfo | null
	if (!ev) return 'unknown'
	// Order matters: an alarm event and a scheduled event both carry `scheduledTime`, and only the
	// scheduled one carries `cron`. Swap these two and every cron invocation is filed as an alarm.
	if ('cron' in ev) return 'scheduled'
	if ('scheduledTime' in ev) return 'alarm'
	// Hoisted to a local: `in` discriminates union members, but it does not strip `undefined` from an
	// optional property on a single interface, so the member access below would not typecheck.
	const ws = ev.getWebSocketEvent
	if (ws) return `ws_${wsKind(ws.webSocketEventType)}`
	if ('rpcMethod' in ev) return `rpc_${ev.rpcMethod}`
	if ('queue' in ev) return 'queue'
	if ('request' in ev) return 'fetch'
	return 'unknown'
}

// `webSocketEventType` is typed as a bare string, so an unrecognised value would otherwise mint a new
// Loki label value — and `handler` is a label.
function wsKind(webSocketEventType: string): string {
	return WS_EVENT_KINDS.has(webSocketEventType) ? webSocketEventType : 'unknown'
}

export function scriptNameOf(item: TraceItem): string {
	return item.scriptName ?? 'unknown'
}

export function entrypointOf(item: TraceItem): string {
	return item.entrypoint ?? 'default'
}

export function scriptVersionOf(item: TraceItem): string {
	return item.scriptVersion?.id ?? 'unknown'
}

// Not errors, and not close calls: `canceled` (the client hung up — routine for websockets) runs at
// ~206k/day and `responseStreamDisconnected` at ~27k/day across the worker and its durable objects.
// Pushing them to Loki would be ~233k lines/day against ~4,650 real errors and would bury the signal.
// They still land in the tallies, where a *change* in their rate is the meaningful thing.
const NON_ERROR_OUTCOMES = new Set(['ok', 'canceled', 'responseStreamDisconnected'])

export function isErrorOutcome(outcome: string): boolean {
	return !NON_ERROR_OUTCOMES.has(outcome)
}

export const WALL_TIME_BUCKETS_MS = [1, 5, 10, 25, 50, 100, 500, 1000] as const

// Fixed cumulative buckets rather than raw durations: Analytics Engine samples rows, which makes
// quantile() over them untrustworthy, while bucket counts stay correct under sampling — scale by
// `_sample_interval` and the quantiles come out right.
export function bucketFlags(wallTimeMs: number): number[] {
	return WALL_TIME_BUCKETS_MS.map((bound) => (wallTimeMs <= bound ? 1 : 0))
}
