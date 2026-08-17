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
		// `?? null` so the result is always a string: JSON.stringify(undefined) is undefined.
		return JSON.stringify(value ?? null)
	} catch (_e) {
		return ''
	}
}

export function buildLokiPush(entries: LokiEntry[]) {
	const streams = new Map<string, { stream: Record<string, string>; values: [string, string][] }>()

	for (const entry of entries) {
		const key = JSON.stringify(Object.entries(entry.labels).sort())
		let stream = streams.get(key)
		if (!stream) {
			stream = { stream: entry.labels, values: [] }
			streams.set(key, stream)
		}
		// Loki wants nanoseconds. eventTimestamp is integer milliseconds.
		stream.values.push([`${Math.trunc(entry.timestampMs)}000000`, JSON.stringify(entry.line)])
	}

	for (const stream of streams.values()) {
		stream.values.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
	}

	return { streams: [...streams.values()] }
}

export async function pushToLoki(env: Environment, entries: LokiEntry[]): Promise<void> {
	if (entries.length === 0) return

	try {
		await fetch(env.GRAFANA_LOKI_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${btoa(`${env.GRAFANA_LOKI_USER}:${env.GRAFANA_LOKI_TOKEN}`)}`,
			},
			body: JSON.stringify(buildLokiPush(entries)),
		})
	} catch (_e) {
		// A failed push must not fail the tail invocation: the tallies for this batch have already
		// been written, and there is nowhere useful to report this from inside a tail consumer.
	}
}
