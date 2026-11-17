import {
	McpPageRead,
	ThumbnailShapeMeasurement,
	ThumbnailSnapshotResponseBody,
	toShapeMeasurements,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { BoxModel } from '@tldraw/tlschema'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { evaluateFlagForUser, getFeatureFlagValue } from '../../utils/featureFlags'
import { ThumbnailRenderJob } from '../../utils/renderTokens'
import { readSnapshotPage } from './boardTools'
import { thumbnailSnapshotBodyFor } from './getThumbnailSnapshot'
import { resolveSharedBoardForUser } from './mcpServer'
import { ResolvedThumbnailBoard, loadBoardSnapshot } from './thumbnailRender'

// Shadow mode for the headless editor's measure path. Page measurement for MCP now happens in the
// caller's own open tab (#11416); this runs the same page through the headless editor off the
// critical path and records how far the two clusterings diverge, so the headless path can be proven
// against the tab before anything is switched to it. See "Headless rendering and shadow comparison"
// in browser-run-thumbnails.md.
//
// It never touches the answer the caller already has: the whole comparison runs in `ctx.waitUntil`
// after the tool has returned, and every failure is swallowed into a telemetry row.
//
// Rollout follows the HEADLESS_WORKER binding, which only staging has (the worker is deployed from
// the tldraw-headless repo as `staging-tldraw-headless-worker`). The `headless_shadow` flag is the
// one control: staging runs it at 100%; production and dev leave the binding unbound, so it is fully
// inert there, and the flag is hidden where no binding backs it (see getAllFeatureFlagValues).
//
// No board identifier leaves this pipeline: the row carries only counts and deltas, like the rest of
// the render telemetry.

/** The render payload the headless worker measures — the same body the render page reads. */
type HeadlessRenderPayload = Extract<ThumbnailSnapshotResponseBody, { error: false }>

export interface HeadlessMeasureRequest {
	payload: HeadlessRenderPayload
}

/**
 * The page's measured geometry keyed by shape id, or a bounded failure code. Mirrors the headless
 * worker's own contract (copied from this repo's thumbnail types), so the binding is typed without
 * the headless worker being a dependency.
 */
export type HeadlessMeasureResult =
	| { ok: true; measurements: Record<string, ThumbnailShapeMeasurement> }
	| { ok: false; reason: string }

/** The service-binding surface. `env.HEADLESS_WORKER` is typed `Service<HeadlessWorkerRpc>`. */
export interface HeadlessWorkerRpc {
	measure(request: HeadlessMeasureRequest): Promise<HeadlessMeasureResult>
}

// Measure returns geometry, which is theme-independent, and sizing never reads the viewport — so a
// fixed job is enough, and two measures of one page are identical (see renderTokens' note on measure
// records). Light matches the measure path's long-standing convention.
const SHADOW_MEASURE_VIEWPORT = { width: 1200, height: 800 } as const

/**
 * The numbers that say how far the headless clustering diverged from the tab's. The cluster id is a
 * hash of its sorted member ids (see getShapeClusters), so an id present in both means the two paths
 * grouped the same shapes together; `onlyTab`/`onlyHeadless` count where the groupings differ. Bounds
 * deltas, over clusters both paths produced, are the numeric measurement difference, in thousandths.
 */
export interface ShadowClusterDiff {
	tabClusters: number
	headlessClusters: number
	matchedClusters: number
	onlyTabClusters: number
	onlyHeadlessClusters: number
	pageShapes: number
	/** Largest single x/y/w/h gap across matched clusters, in thousandths. */
	maxBoundsDelta: number
	/** Mean of those gaps over matched clusters with bounds on both sides, in thousandths. */
	meanBoundsDelta: number
}

/** The widest of a box's four coordinate gaps, which is 0 only when the two boxes are identical. */
function boundsDelta(a: BoxModel, b: BoxModel): number {
	return Math.max(
		Math.abs(a.x - b.x),
		Math.abs(a.y - b.y),
		Math.abs(a.w - b.w),
		Math.abs(a.h - b.h)
	)
}

/**
 * Compares the whole-page clustering the tab produced against the one derived from the headless
 * editor's measurements. Pure, so the comparison is tested without a tab or a worker.
 */
export function diffClusterReads(tab: McpPageRead, headless: McpPageRead): ShadowClusterDiff {
	const headlessById = new Map(headless.clusters.map((cluster) => [cluster.id, cluster]))
	let matched = 0
	let onlyTab = 0
	let maxBoundsDelta = 0
	let deltaSum = 0
	let deltaCount = 0
	for (const cluster of tab.clusters) {
		const counterpart = headlessById.get(cluster.id)
		if (!counterpart) {
			onlyTab++
			continue
		}
		matched++
		if (cluster.bounds && counterpart.bounds) {
			const delta = boundsDelta(cluster.bounds, counterpart.bounds)
			maxBoundsDelta = Math.max(maxBoundsDelta, delta)
			deltaSum += delta
			deltaCount++
		}
	}
	return {
		tabClusters: tab.clusters.length,
		headlessClusters: headless.clusters.length,
		matchedClusters: matched,
		onlyTabClusters: onlyTab,
		onlyHeadlessClusters: headless.clusters.length - matched,
		pageShapes: tab.clusters.reduce((total, cluster) => total + cluster.numberOfShapes, 0),
		maxBoundsDelta,
		meanBoundsDelta: deltaCount ? deltaSum / deltaCount : 0,
	}
}

// The `op`/`reference` blobs leave room for the screenshot arm (op:screenshot, reference:browser_run)
// to land on this same event. The doubles are positional, so their order must not change:
// [tabClusters, headlessClusters, matched, onlyTab, onlyHeadless, pageShapes, maxBoundsDelta,
// meanBoundsDelta, headlessMs].
function writeShadowCompareTelemetry(
	env: Environment,
	outcome: string,
	headlessMs: number,
	diff?: ShadowClusterDiff
) {
	writeDataPoint(undefined, env.MEASURE, env, 'render_shadow_compare', {
		blobs: ['op:measure', 'reference:tab', `outcome:${outcome}`],
		doubles: [
			diff?.tabClusters ?? 0,
			diff?.headlessClusters ?? 0,
			diff?.matchedClusters ?? 0,
			diff?.onlyTabClusters ?? 0,
			diff?.onlyHeadlessClusters ?? 0,
			diff?.pageShapes ?? 0,
			diff?.maxBoundsDelta ?? 0,
			diff?.meanBoundsDelta ?? 0,
			headlessMs,
		],
	})
}

/**
 * The fixed measure job for a resolved board's page. Only `pageId`, `mode` and the render params are
 * read by `thumbnailSnapshotBodyFor`; the signed fields are filled from the resolution so the payload
 * is byte-identical to what a real measure render would push. `null` when the (possibly stale) R2
 * snapshot no longer has the page the tab read.
 */
function buildMeasurePayload(
	snapshot: RoomSnapshot,
	board: ResolvedThumbnailBoard,
	pageId: string
): HeadlessRenderPayload | null {
	const job: ThumbnailRenderJob = {
		v: 1,
		kind: board.kind,
		slug: board.slug,
		version: board.version,
		access: board.access,
		surface: 'mcp',
		camera: 'content',
		pageId,
		mode: 'measure',
		x: 0,
		y: 0,
		z: 1,
		width: SHADOW_MEASURE_VIEWPORT.width,
		height: SHADOW_MEASURE_VIEWPORT.height,
		theme: 'light',
		exp: Date.now() + 60_000,
	}
	const body = thumbnailSnapshotBodyFor(snapshot, job)
	return body.error ? null : body
}

/**
 * Runs the headless editor over the page the tab just read and records how its clustering compares.
 * Returns on the first thing that can't line up, with a telemetry row naming where it stopped. Call
 * only inside `ctx.waitUntil`, and only when `env.HEADLESS_WORKER` is bound — see the module header.
 */
export async function compareMeasureInShadow(
	env: Environment,
	{ boardId, userId, read }: { boardId: string; userId: string; read: McpPageRead }
): Promise<void> {
	const headless = env.HEADLESS_WORKER
	if (!headless) return
	let headlessMs = 0
	try {
		// The one control: staging runs it at 100%, production rolls up from 0% once it has a binding.
		const flag = await getFeatureFlagValue(env, 'headless_shadow')
		if (!evaluateFlagForUser(flag, 'headless_shadow', userId)) return

		// The MCP read path leaves the document server-blind on purpose; the shadow reloads the
		// persisted R2 snapshot here, off the critical path, which can lag the live tab by an edit.
		const resolved = await resolveSharedBoardForUser(env, boardId, userId)
		if (!resolved.ok) return writeShadowCompareTelemetry(env, 'resolve_failed', headlessMs)
		const snapshot = await loadBoardSnapshot(env, resolved.board, {
			access: resolved.board.access,
			file: resolved.board.file,
		})
		if (!snapshot) return writeShadowCompareTelemetry(env, 'no_snapshot', headlessMs)

		const payload = buildMeasurePayload(snapshot, resolved.board, read.pageId)
		if (!payload) return writeShadowCompareTelemetry(env, 'page_missing', headlessMs)

		const startedAt = Date.now()
		const result = await headless.measure({ payload })
		headlessMs = Date.now() - startedAt
		if (!result.ok) return writeShadowCompareTelemetry(env, 'headless_failed', headlessMs)

		// Clusters the headless measurements the same way a tab's read is clustered, so the two
		// McpPageReads are the same shape and compare directly.
		const headlessRead = readSnapshotPage(
			snapshot,
			{ kind: 'id', id: read.pageId },
			toShapeMeasurements(result.measurements),
			[]
		)
		if (!headlessRead.ok) return writeShadowCompareTelemetry(env, 'page_missing', headlessMs)

		writeShadowCompareTelemetry(env, 'ok', headlessMs, diffClusterReads(read, headlessRead.read))
	} catch {
		// A shadow comparison must never reach the caller, who already has the tab's answer.
		writeShadowCompareTelemetry(env, 'error', headlessMs)
	}
}
