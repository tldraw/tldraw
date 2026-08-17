/// <reference types="@cloudflare/workers-types" />

import { AggBucket } from './aggregate'
import { entrypointOf, scriptNameOf, scriptVersionOf } from './classify'

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

export function toErrRow(item: TraceItem, handler: string): ErrRow {
	const first = item.exceptions[0]
	return {
		scriptName: scriptNameOf(item),
		entrypoint: entrypointOf(item),
		handler,
		outcome: item.outcome,
		// `exceededCpu` and `exceededMemory` arrive with no exception attached, and `error_name` is a
		// Loki label, so it needs a value rather than an empty string.
		errorName: first?.name ?? 'none',
		message: first?.message ?? '',
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

// A telemetry write must never be the thing that fails a tail invocation — a thrown error here would
// lose the Loki push for the same batch.
function write(dataset: AnalyticsEngineDataset | undefined, point: AnalyticsEngineDataPoint): void {
	try {
		dataset?.writeDataPoint(point)
	} catch (_e) {
		// intentionally swallowed
	}
}
