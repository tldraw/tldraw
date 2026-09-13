/// <reference types="@cloudflare/workers-types" />

import { writePushRow } from './analytics'
import { entrypointOf, scriptNameOf, scriptVersionOf } from './classify'
import { redactConsoleArgsSlug, redactRoomNotFoundSlug } from './slugs'
import { Environment } from './types'

const MAX_LOG_ENTRIES = 20
const MAX_LOG_CHARS = 2000
const MAX_LABEL_CHARS = 64
// The design budgets ~3 KB per Loki line; an unbounded stack or exception list can blow past that by
// an order of magnitude on its own.
const MAX_STACK_CHARS = 8000
const MAX_EXCEPTIONS = 3

function clip(value: string, max: number): string {
	return value.length <= max ? value : value.slice(0, max)
}

export interface LokiEntry {
	labels: Record<string, string>
	timestampMs: number
	line: Record<string, unknown>
}

interface AnyEventInfo {
	cron?: string
	getWebSocketEvent?: { webSocketEventType: string; code?: number; wasClean?: boolean }
	rpcMethod?: string
	queue?: string
	request?: { method: string; url: string }
}

export function toLokiEntry(
	item: TraceItem,
	handler: string,
	errorName: string,
	tldrawEnv: string,
	tldrDoc: DurableObjectNamespace | undefined
): LokiEntry {
	const clippedHandler = clip(handler, MAX_LABEL_CHARS)
	return {
		// Labels are the cardinality budget: anything per-room, per-user or per-request belongs in the
		// line below, not here.
		labels: {
			service_name: scriptNameOf(item),
			env: tldrawEnv,
			entrypoint: entrypointOf(item),
			handler: clippedHandler,
			outcome: item.outcome,
			error_name: errorName.slice(0, MAX_LABEL_CHARS),
		},
		timestampMs: item.eventTimestamp ?? Date.now(),
		line: {
			...eventDetails(item.event as AnyEventInfo | null),
			durableObjectId: item.durableObjectId ?? '',
			scriptVersion: scriptVersionOf(item),
			outcome: item.outcome,
			handler: clippedHandler,
			error_name: errorName,
			// RoomNotFoundError's message (and the stack built from it) embed a file slug — the whole
			// authority of a board — which must never reach this third-party log sink as free text.
			message: redactRoomNotFoundSlug(item.exceptions[0]?.message ?? '', tldrDoc),
			stack: clip(
				redactRoomNotFoundSlug(item.exceptions[0]?.stack ?? '', tldrDoc),
				MAX_STACK_CHARS
			),
			exceptions: item.exceptions.slice(0, MAX_EXCEPTIONS).map((e) => ({
				name: e.name,
				message: redactRoomNotFoundSlug(e.message, tldrDoc),
				stack: clip(redactRoomNotFoundSlug(e.stack ?? '', tldrDoc), MAX_STACK_CHARS),
			})),
			logs: captureLogs(item.logs, tldrDoc),
			wallTime: item.wallTime,
			cpuTime: item.cpuTime,
			truncated: item.truncated,
		},
	}
}

// The request URL carries the room slug, so it never leaves the worker — only the method does.
function eventDetails(ev: AnyEventInfo | null): Record<string, unknown> {
	if (!ev) return {}
	if (ev.cron !== undefined) return { cron: ev.cron }
	if (ev.getWebSocketEvent !== undefined) {
		return {
			webSocketEventType: ev.getWebSocketEvent.webSocketEventType,
			webSocketCloseCode: ev.getWebSocketEvent.code ?? null,
			webSocketWasClean: ev.getWebSocketEvent.wasClean ?? null,
		}
	}
	if (ev.rpcMethod !== undefined) return { rpcMethod: ev.rpcMethod }
	if (ev.queue !== undefined) return { queue: ev.queue }
	if (ev.request !== undefined) return { requestMethod: ev.request.method }
	return {}
}

function captureLogs(
	logs: TraceLog[],
	tldrDoc: DurableObjectNamespace | undefined
): { level: string; message: string }[] {
	return logs.slice(0, MAX_LOG_ENTRIES).map((log) => {
		// TLFileDurableObject.ts's db-load failure paths log `console.error('failed to retrieve
		// document' | 'failed to fetch doc', slug, error)` — redact before stringifying, not after:
		// matching against JSON-escaped text is a different, harder problem.
		const message = Array.isArray(log.message)
			? redactConsoleArgsSlug(log.message, tldrDoc)
			: log.message
		return {
			level: log.level,
			message: safeStringify(message).slice(0, MAX_LOG_CHARS),
		}
	})
}

function safeStringify(value: unknown): string {
	if (typeof value === 'string') return value
	try {
		// `?? null` covers nullish input; the typeof check covers the rest. JSON.stringify returns
		// undefined — not a string, and without throwing — for a bare function or symbol, and
		// captureLogs slices whatever comes back.
		const json = JSON.stringify(value ?? null)
		return typeof json === 'string' ? json : ''
	} catch (_e) {
		return ''
	}
}

export function buildLokiPush(entries: LokiEntry[]) {
	const streams = new Map<string, { stream: Record<string, string>; values: [string, string][] }>()

	// Sorted on the millisecond source, before the ns strings exist: those exceed
	// Number.MAX_SAFE_INTEGER, so comparing them as strings would sort lexicographically instead.
	for (const entry of [...entries].sort((a, b) => a.timestampMs - b.timestampMs)) {
		const key = JSON.stringify(Object.entries(entry.labels).sort())
		let stream = streams.get(key)
		if (!stream) {
			stream = { stream: entry.labels, values: [] }
			streams.set(key, stream)
		}
		// Loki wants nanoseconds. eventTimestamp is integer milliseconds.
		stream.values.push([`${Math.trunc(entry.timestampMs)}000000`, JSON.stringify(entry.line)])
	}

	return { streams: [...streams.values()] }
}

export async function pushToLoki(env: Environment, entries: LokiEntry[]): Promise<void> {
	if (entries.length === 0) return

	// Built outside the try on purpose. The catch below is for transport failures; a bug in the
	// grouping or serialisation should crash loudly rather than disappear into it.
	const body = JSON.stringify(buildLokiPush(entries))

	try {
		const res = await fetch(env.GRAFANA_LOKI_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${btoa(`${env.GRAFANA_LOKI_USER}:${env.GRAFANA_LOKI_TOKEN}`)}`,
			},
			body,
		})
		// Neither res.ok nor a thrown error was checked before this row existed, so a rotated token,
		// a bad entry, a rate limit or a 5xx were all indistinguishable from success — in the one
		// worker whose job is seeing failures the platform otherwise hides.
		writePushRow(env.TAIL, String(res.status), entries.length)
	} catch (_e) {
		// A failed push must not fail the tail invocation: the tallies for this batch have already
		// been written, and there is nowhere useful to report this from inside a tail consumer.
		writePushRow(env.TAIL, 'transport_error', entries.length)
	}
}
