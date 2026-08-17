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
