import { BoxModel, TLArrowBinding, TLShape } from '@tldraw/tlschema'
import {
	ClusterBounds,
	ClusterMeasurement,
	ShapeCluster,
	TLShapeWithPlainText,
	getShapeClusters,
} from './shapeClusters'
import {
	MAX_THUMBNAIL_PAGES,
	MeasuredArrow,
	MeasuredDimensions,
	ThumbnailShapeMeasurement,
} from './types'

// How an MCP read tool's page is worked out. The caller's open tab runs this against its own store,
// so a read never makes the board's room serialize the document: that blocked every collaborator on
// the board for as long as it took, around 175 ms a call on a 20,000-shape page. The worker's eval
// harness runs the same function over a fixture snapshot, so an eval reads what a tab would send.
//
// What comes back is sized to the answer rather than the page: a summary of every cluster, and full
// records only for the clusters the call named.

// A page is named either by its 0-based ordinal or by its id. Ordinals read naturally but shift the
// moment pages are reordered, so an id a caller is holding from an earlier call keeps pointing at the
// same page. Both are accepted in the one argument so the tool surface stays small.
export type PageSelector = { kind: 'ordinal'; ordinal: number } | { kind: 'id'; id: string }

export interface McpPageEntry {
	/** The 0-based ordinal callers pass as `page`. */
	index: number
	id: string
	name: string
}

/**
 * A board's pages in the order the editor shows them. tldraw page indexes are fractional indexes that
 * sort lexicographically, so a plain string sort matches the editor's ordering.
 */
export function orderMcpPages(
	pages: ReadonlyArray<{ id: string; name: string; index: string }>
): McpPageEntry[] {
	return [...pages]
		.sort((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0))
		.slice(0, MAX_THUMBNAIL_PAGES)
		.map((page, index) => ({
			index,
			id: String(page.id),
			name: typeof page.name === 'string' && page.name.length > 0 ? page.name : `Page ${index + 1}`,
		}))
}

export type McpPageLookup =
	| { ok: true; page: McpPageEntry }
	| { ok: false; reason: 'no_pages' | 'page_out_of_range'; pageCount: number }

export function findMcpPage(
	pages: ReadonlyArray<{ id: string; name: string; index: string }>,
	selector: PageSelector
): McpPageLookup {
	const ordered = orderMcpPages(pages)
	if (ordered.length === 0) return { ok: false, reason: 'no_pages', pageCount: 0 }
	const page =
		selector.kind === 'id' ? ordered.find((p) => p.id === selector.id) : ordered[selector.ordinal]
	return page
		? { ok: true, page }
		: { ok: false, reason: 'page_out_of_range', pageCount: ordered.length }
}

/**
 * What an editor reports for one shape: what clustering reads (its page bounds and, for an arrow,
 * where the editor drew it), plus the text its ShapeUtil reported and, for a text, group, draw or
 * highlight shape, its size as drawn.
 */
export interface ShapeMeasurement extends ClusterMeasurement {
	text?: string
	dimensions?: MeasuredDimensions
}

// Malformed boxes are dropped rather than kept: a non-finite value would produce NaN distances and
// silently detach that shape from the minimum spanning tree.
export function toShapeMeasurements(
	reported: Record<string, ThumbnailShapeMeasurement>
): Record<string, ShapeMeasurement> {
	const bounds: Record<string, ShapeMeasurement> = {}
	for (const [shapeId, box] of Object.entries(reported)) {
		if (
			!Number.isFinite(box?.x) ||
			!Number.isFinite(box?.y) ||
			!Number.isFinite(box?.w) ||
			!Number.isFinite(box?.h)
		) {
			continue
		}
		const arrow = readArrow(box.arrow)
		const dimensions = readDimensions(box.dimensions)
		bounds[shapeId] = {
			minX: box.x,
			minY: box.y,
			maxX: box.x + box.w,
			maxY: box.y + box.h,
			...(typeof box.text === 'string' && box.text ? { text: box.text } : null),
			...(arrow ? { arrow } : null),
			...(dimensions ? { dimensions } : null),
		}
	}
	return bounds
}

// Malformed arrow geometry is dropped and the shape's bounds kept: get_cluster_info then reports the
// arrow from its record.
function readArrow(value: ThumbnailShapeMeasurement['arrow']): MeasuredArrow | undefined {
	const start = readPoint(value?.start)
	const end = readPoint(value?.end)
	return start && end ? { start, end } : undefined
}

function readPoint(value: unknown) {
	const { x, y } = (value ?? {}) as { x?: unknown; y?: unknown }
	return isFiniteNumber(x) && isFiniteNumber(y) ? { x, y } : undefined
}

// Malformed dimensions are dropped the same way: the shape reports the w and h on its record.
function readDimensions(
	value: ThumbnailShapeMeasurement['dimensions']
): MeasuredDimensions | undefined {
	const { w, h } = (value ?? {}) as { w?: unknown; h?: unknown }
	return isFiniteNumber(w) && isFiniteNumber(h) && w >= 0 && h >= 0 ? { w, h } : undefined
}

function isFiniteNumber(value: unknown): value is number {
	return Number.isFinite(value)
}

/** One cluster as get_page_info lists it. `bounds` is null for a cluster the tab could not measure. */
export interface McpClusterSummary {
	id: string
	label: string
	keywords: string[]
	numberOfShapes: number
	bounds: BoxModel | null
}

export interface McpPageRead {
	pageId: string
	pageName: string
	/**
	 * Every cluster on the page when the read named none, which is how get_page_info reads; empty
	 * otherwise. Past MAX_CLUSTERING_ATOMS every shape can be its own cluster, so on a large page this
	 * list runs to megabytes that get_cluster_info and get_cluster_screenshot have no use for.
	 */
	clusters: McpClusterSummary[]
	/** The named clusters that exist, with their shapes. A named id that isn't here wasn't found. */
	details: ShapeCluster[]
	/**
	 * The box around each cluster in `details` that the tab could measure, by cluster id, which is what
	 * get_cluster_screenshot sizes its image from. Absent from tabs running a client older than it.
	 */
	detailBounds?: Record<string, BoxModel>
	/** Shapes outside `details` that its shapes sit inside, which their page positions depend on. */
	ancestors: TLShape[]
	/** The arrow bindings of the arrows in `details`, as stored. */
	bindings: TLArrowBinding[]
	/** Where each arrow in `details` is drawn, by shape id. */
	arrows: Record<string, MeasuredArrow>
	/** The drawn size of the shapes in `details` that report one, by shape id. */
	dimensions: Record<string, MeasuredDimensions>
}

/**
 * Clusters a page and keeps what the read tools answer from.
 *
 * Bounds and arrow ends drive the linkage, alongside the page's bindings; the measured text is
 * attached to the shapes so labelling reads the editor's answer rather than re-deriving one from
 * props.
 */
export function readMcpPage({
	pageId,
	pageName,
	shapes,
	bindings,
	measurements,
	clusterIds,
}: {
	pageId: string
	pageName: string
	/** Every shape on the page, nested ones included. */
	shapes: TLShape[]
	/** The arrow bindings of the page's arrows. */
	bindings: TLArrowBinding[]
	measurements: Record<string, ShapeMeasurement>
	clusterIds: readonly string[]
}): McpPageRead {
	const withText: TLShapeWithPlainText[] = shapes.map((shape) => {
		const text = measurements[shape.id as string]?.text
		return text ? { ...shape, plainText: text } : shape
	})
	const clusters = getShapeClusters(withText, pageId, measurements, bindings)

	const summaries = (clusterIds.length > 0 ? [] : clusters).map((cluster) => ({
		id: cluster.id,
		label: cluster.label,
		keywords: cluster.keywords,
		numberOfShapes: cluster.numberOfShapes,
		bounds: toClusterBox(cluster.shapes.map((shape) => measurements[shape.id])),
	}))

	const byId = new Map(clusters.map((cluster) => [cluster.id, cluster]))
	const details = [...new Set(clusterIds)].flatMap((id) => byId.get(id) ?? [])
	const detailShapes = new Set<string>(details.flatMap((c) => c.shapes.map((shape) => shape.id)))
	const detailBounds: Record<string, BoxModel> = {}
	for (const cluster of details) {
		const box = toClusterBox(cluster.shapes.map((shape) => measurements[shape.id]))
		if (box) detailBounds[cluster.id] = box
	}

	const shapesById = new Map<string, TLShape>(shapes.map((shape) => [shape.id, shape]))
	const ancestors = new Map<string, TLShape>()
	for (const id of detailShapes) {
		let parent = shapesById.get(shapesById.get(id)!.parentId)
		// Bounded, so a cyclic parentId in a corrupt document ends rather than spins.
		for (let depth = 0; parent && depth < 100; depth++) {
			if (!detailShapes.has(parent.id)) ancestors.set(parent.id, parent)
			parent = shapesById.get(parent.parentId)
		}
	}

	const arrows: Record<string, MeasuredArrow> = {}
	const dimensions: Record<string, MeasuredDimensions> = {}
	for (const id of detailShapes) {
		const measurement = measurements[id]
		if (measurement?.arrow) arrows[id] = measurement.arrow
		if (measurement?.dimensions) dimensions[id] = measurement.dimensions
	}

	return {
		pageId,
		pageName,
		clusters: summaries,
		details,
		detailBounds,
		ancestors: [...ancestors.values()],
		bindings: bindings.filter((binding) => detailShapes.has(binding.fromId)),
		arrows,
		dimensions,
	}
}

/** The box around some shapes, in thousandths, or null when none were measured. */
export function toClusterBox(boxes: (ClusterBounds | undefined)[]): BoxModel | null {
	let union: ClusterBounds | null = null
	for (const box of boxes) {
		if (!box) continue
		union = union
			? {
					minX: Math.min(union.minX, box.minX),
					minY: Math.min(union.minY, box.minY),
					maxX: Math.max(union.maxX, box.maxX),
					maxY: Math.max(union.maxY, box.maxY),
				}
			: box
	}
	if (!union) return null
	return {
		x: toThousandths(union.minX),
		y: toThousandths(union.minY),
		w: toThousandths(union.maxX - union.minX),
		h: toThousandths(union.maxY - union.minY),
	}
}

export function toThousandths(value: number) {
	return Math.round(value * 1000) / 1000
}
