/// <reference types="@cloudflare/workers-types" />

import { entrypointOf, scriptNameOf, scriptVersionOf } from './classify'
import { Environment } from './types'

const MAX_LOG_ENTRIES = 20
const MAX_LOG_CHARS = 2000
const MAX_LABEL_CHARS = 64

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
	tldrawEnv: string
): LokiEntry {
	return {
		// Labels are the cardinality budget: anything per-room, per-user or per-request belongs in the
		// line below, not here.
		labels: {
			service_name: scriptNameOf(item),
			env: tldrawEnv,
			entrypoint: entrypointOf(item),
			handler,
			outcome: item.outcome,
			error_name: errorName.slice(0, MAX_LABEL_CHARS),
		},
		timestampMs: item.eventTimestamp ?? 0,
		line: {
			...eventDetails(item.event as AnyEventInfo | null),
			durableObjectId: item.durableObjectId ?? '',
			scriptVersion: scriptVersionOf(item),
			outcome: item.outcome,
			handler,
			error_name: errorName,
			message: item.exceptions[0]?.message ?? '',
			stack: item.exceptions[0]?.stack ?? '',
			exceptions: item.exceptions.map((e) => ({
				name: e.name,
				message: e.message,
				stack: e.stack ?? '',
			})),
			logs: captureLogs(item.logs),
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

function captureLogs(logs: TraceLog[]): { level: string; message: string }[] {
	return logs.slice(0, MAX_LOG_ENTRIES).map((log) => ({
		level: log.level,
		message: safeStringify(log.message).slice(0, MAX_LOG_CHARS),
	}))
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

	// Sorted numerically on the millisecond source, before the nanosecond strings exist. Loki wants
	// entries ordered within a stream, and the ns values exceed Number.MAX_SAFE_INTEGER — so comparing
	// the rendered strings would be lexicographic and would mis-order any two of different digit
	// length ("999000000" > "1000000000"). Grouping preserves insertion order, so each stream inherits
	// this sort.
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
		await fetch(env.GRAFANA_LOKI_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${btoa(`${env.GRAFANA_LOKI_USER}:${env.GRAFANA_LOKI_TOKEN}`)}`,
			},
			body,
		})
	} catch (_e) {
		// A failed push must not fail the tail invocation: the tallies for this batch have already
		// been written, and there is nowhere useful to report this from inside a tail consumer.
	}
}
