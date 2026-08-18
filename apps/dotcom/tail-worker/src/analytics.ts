/// <reference types="@cloudflare/workers-types" />

import { AggBucket } from './aggregate'
import { entrypointOf, scriptNameOf, scriptVersionOf } from './classify'
import { redactRoomNotFoundSlug } from './slugs'

// Analytics Engine allows 16 KB across all blobs on a data point and 96 bytes for the index. Only the
// message is unbounded in practice, but clipping every blob means no future field can silently push a
// row over and get it dropped.
const MAX_BLOB_CHARS = 1024
const MAX_INDEX_CHARS = 96

function clip(value: string, max: number): string {
	return value.length <= max ? value : value.slice(0, max)
}

export interface ErrRow {
	scriptName: string
	entrypoint: string
	handler: string
	outcome: string
	errorName: string
	message: string
	scriptVersion: string
	durableObjectId: string
	wallTime: number
	cpuTime: number
	exceptionCount: number
}

export function toErrRow(
	item: TraceItem,
	handler: string,
	tldrDoc: DurableObjectNamespace | undefined
): ErrRow {
	const first = item.exceptions[0]
	return {
		scriptName: scriptNameOf(item),
		entrypoint: entrypointOf(item),
		handler,
		outcome: item.outcome,
		// `exceededCpu` and `exceededMemory` arrive with no exception attached, and `error_name` is a
		// Loki label, so it needs a value rather than an empty string.
		errorName: first?.name ?? 'none',
		// RoomNotFoundError's message embeds a file slug; redact before it becomes an AE blob.
		message: redactRoomNotFoundSlug(first?.message ?? '', tldrDoc),
		scriptVersion: scriptVersionOf(item),
		durableObjectId: item.durableObjectId ?? '',
		wallTime: item.wallTime,
		cpuTime: item.cpuTime,
		exceptionCount: item.exceptions.length,
	}
}

export function writeAggRow(dataset: AnalyticsEngineDataset | undefined, bucket: AggBucket): void {
	write(dataset, {
		blobs: [
			'agg',
			bucket.scriptName,
			bucket.entrypoint,
			bucket.handler,
			bucket.outcome,
			bucket.scriptVersion,
		].map((blob) => clip(blob, MAX_BLOB_CHARS)),
		doubles: [
			bucket.count,
			bucket.sumWall,
			bucket.maxWall,
			bucket.sumCpu,
			bucket.maxCpu,
			...bucket.le,
		],
	})
}

export function writeErrRow(dataset: AnalyticsEngineDataset | undefined, row: ErrRow): void {
	write(dataset, {
		// Indexing on the durable object id is deliberate: it is the key Cloudflare's own `objectId`
		// dimension uses and the key every MEASURE event already indexes on, so an error row joins
		// straight to the dashboards we have. `idFromName` is one-way, so the id cannot reopen a board.
		indexes: [clip(row.durableObjectId, MAX_INDEX_CHARS)],
		blobs: [
			'err',
			row.scriptName,
			row.entrypoint,
			row.handler,
			row.outcome,
			row.errorName,
			row.message,
			row.scriptVersion,
		].map((blob) => clip(blob, MAX_BLOB_CHARS)),
		doubles: [row.wallTime, row.cpuTime, row.exceptionCount],
	})
}

// The Loki push itself has no other failure signal: pushToLoki swallows both a non-ok response and a
// transport error so a telemetry outage can never fail the tail invocation, which otherwise makes a
// rotated token, a bad entry, or a rate limit indistinguishable from success. One row per push, not
// per event, so volume is bounded by batch count.
export function writePushRow(
	dataset: AnalyticsEngineDataset | undefined,
	status: string,
	entryCount: number
): void {
	write(dataset, {
		blobs: ['push', clip(status, MAX_BLOB_CHARS)],
		doubles: [entryCount],
	})
}

// Mirrors writePushRow: worker.ts's per-item try/catch swallows a malformed TraceItem so it can't take
// out the rest of the batch, but a systematic failure must still leave a signal somewhere rather than
// vanishing the way an unchecked Loki push used to. One row per skipped item. `reason` goes through the
// same slug redaction as everything else here on the off chance a thrown error's message embeds one.
export function writeSkipRow(
	dataset: AnalyticsEngineDataset | undefined,
	reason: string,
	tldrDoc: DurableObjectNamespace | undefined
): void {
	write(dataset, {
		blobs: ['skip', clip(redactRoomNotFoundSlug(reason, tldrDoc), MAX_BLOB_CHARS)],
		doubles: [1],
	})
}

// A telemetry write must never be the thing that fails a tail invocation — a thrown error here would
// lose the Loki push for the same batch.
function write(dataset: AnalyticsEngineDataset | undefined, point: AnalyticsEngineDataPoint): void {
	try {
		dataset?.writeDataPoint(point)
	} catch (_e) {
		// intentionally swallowed
	}
}
