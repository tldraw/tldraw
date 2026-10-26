import type { RenderOptions } from 'pele'
import {
	getAccumulatedTranslate,
	parseTranslate,
	type ParsedCluster,
	type ParsedDiagramLayout,
	type ParsedEdge,
	type ParsedEdgeLabel,
	type ParsedNode,
	scaleLayout,
	type Vec2,
} from './svgParsing'
import { LAYOUT_SCALE } from './utils'

let pelePromise: Promise<typeof import('pele/lazy')> | undefined

/**
 * Load pele's core. Each diagram type's parser and renderer are a separate chunk that
 * {@link parsePeleDiagram} loads on first use, so pasting a flowchart never pulls in, say, gantt.
 */
export function loadPele() {
	pelePromise ??= import('pele/lazy')
	return pelePromise
}

/** Detect, load and parse a diagram. Returns null when the text isn't a diagram pele knows. */
export async function parsePeleDiagram(text: string) {
	const pele = await loadPele()
	const type = pele.detectType(text)
	if (!type) return null
	await pele.load(type)
	return { type, model: pele.parse(text), pele }
}

/**
 * Render a parsed diagram and mount its SVG offscreen while `read` runs, so getBBox() works for
 * the shapes pele draws as paths (cylinders, documents, clouds).
 */
export async function withMountedPeleSvg<T>(
	text: string,
	options: RenderOptions,
	read: (root: SVGSVGElement) => T
): Promise<T> {
	const pele = await loadPele()
	// Rendered from the source rather than its parsed model: pele ignores `options.config` when
	// handed a model, which silently drops every layout setting passed in.
	const { svg } = pele.render(text, options)
	const offscreen = document.createElement('div')
	Object.assign(offscreen.style, {
		position: 'absolute',
		left: '-9999px',
		top: '-9999px',
		overflow: 'hidden',
	})
	document.body.appendChild(offscreen)
	try {
		offscreen.innerHTML = svg
		const root = offscreen.querySelector('svg')
		if (!root) throw new Error('pele produced no svg')
		return read(root)
	} finally {
		offscreen.remove()
	}
}

export interface PeleLayoutOptions {
	/** The two node ids an edge joins, from the model. Edges it can't place are matched by proximity. */
	edgeEnds?(edgeId: string): { start: string; end: string } | undefined
	/** The model id for a node's `data-id`, when they differ. */
	nodeId?(dataId: string): string
}

/**
 * Read node, cluster, edge and label positions from pele's SVG. Every diagram type marks these the
 * same way (`.pele-node`, `.pele-cluster`, `.pele-edge`, `.pele-edge-label`, each with the model's
 * id in `data-id`), so one reader serves them all.
 */
export function parsePeleLayout(
	root: Element,
	options: PeleLayoutOptions = {}
): ParsedDiagramLayout {
	const nodeId = options.nodeId ?? ((id: string) => id)

	const nodes = new Map<string, ParsedNode>()
	for (const el of root.querySelectorAll('.pele-node[data-id], .pele-note[data-id]')) {
		// Resolved before any skip: the mindmap resolver counts calls to tell repeated names apart.
		const id = nodeId(el.getAttribute('data-id')!)
		const shape = el.firstElementChild
		if (!shape) continue
		const origin = getOrigin(el)
		const box = getShapeBox(shape)
		nodes.set(id, {
			id,
			center: { x: origin.x + box.x + box.w / 2, y: origin.y + box.y + box.h / 2 },
			width: box.w,
			height: box.h,
		})
	}

	const clusters = new Map<string, ParsedCluster>()
	for (const el of root.querySelectorAll('.pele-cluster[data-id]')) {
		const rect = el.querySelector('rect')
		if (!rect) continue
		const id = el.getAttribute('data-id')!
		const origin = getOrigin(el)
		clusters.set(id, {
			id,
			topLeft: { x: origin.x + num(rect, 'x'), y: origin.y + num(rect, 'y') },
			width: num(rect, 'width'),
			height: num(rect, 'height'),
		})
	}

	const edges: ParsedEdge[] = []
	for (const el of root.querySelectorAll('.pele-edge[data-id]')) {
		const path = el.querySelector('path:not(.pele-marker)')
		if (!path) continue
		const id = el.getAttribute('data-id')!
		const origin = getOrigin(el)
		const points = parsePathPoints(path.getAttribute('d') ?? '').map((point) => ({
			x: point.x + origin.x,
			y: point.y + origin.y,
		}))
		const ends = options.edgeEnds?.(id) ?? { start: '', end: '' }
		edges.push({ id, ...ends, points })
	}

	const edgeLabels = new Map<string, ParsedEdgeLabel>()
	for (const el of root.querySelectorAll('.pele-edge-label[data-id]')) {
		const rect = el.querySelector('rect')
		if (!rect) continue
		const origin = getOrigin(el)
		edgeLabels.set(el.getAttribute('data-id')!, {
			x: origin.x + num(rect, 'x'),
			y: origin.y + num(rect, 'y'),
			w: num(rect, 'width'),
			h: num(rect, 'height'),
		})
	}

	const layout = { nodes, clusters, edges, edgeLabels }
	scaleLayout(layout, LAYOUT_SCALE)
	return layout
}

function num(el: Element, attr: string) {
	return parseFloat(el.getAttribute(attr) || '0')
}

/** The element's own translate plus its ancestors'. */
export function getOrigin(el: Element): Vec2 {
	const ancestor = getAccumulatedTranslate(el)
	const self = parseTranslate(el.getAttribute('transform'))
	return { x: ancestor.x + self.x, y: ancestor.y + self.y }
}

/** Bounds of a node's outline, relative to the node's origin. */
function getShapeBox(shape: Element): { x: number; y: number; w: number; h: number } {
	try {
		const bbox = (shape as SVGGraphicsElement).getBBox()
		if (bbox.width > 0 && bbox.height > 0) {
			return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height }
		}
	} catch {
		// not a live SVG element (jsdom)
	}
	switch (shape.tagName.toLowerCase()) {
		case 'rect':
			return {
				x: num(shape, 'x'),
				y: num(shape, 'y'),
				w: num(shape, 'width'),
				h: num(shape, 'height'),
			}
		case 'circle': {
			const r = num(shape, 'r')
			return { x: num(shape, 'cx') - r, y: num(shape, 'cy') - r, w: r * 2, h: r * 2 }
		}
		case 'ellipse': {
			const rx = num(shape, 'rx')
			const ry = num(shape, 'ry')
			return { x: num(shape, 'cx') - rx, y: num(shape, 'cy') - ry, w: rx * 2, h: ry * 2 }
		}
		case 'polygon':
			return getPointsBox(parseNumberPairs(shape.getAttribute('points') ?? ''))
		case 'path':
			return getPointsBox(parsePathPoints(shape.getAttribute('d') ?? ''))
		default:
			return { x: 0, y: 0, w: 0, h: 0 }
	}
}

function getPointsBox(points: Vec2[]) {
	if (!points.length) return { x: 0, y: 0, w: 0, h: 0 }
	const xs = points.map((point) => point.x)
	const ys = points.map((point) => point.y)
	const x = Math.min(...xs)
	const y = Math.min(...ys)
	return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

function parseNumberPairs(text: string): Vec2[] {
	const values = text.match(/-?[\d.]+(?:e[+-]?\d+)?/gi)?.map(Number) ?? []
	const out: Vec2[] = []
	for (let i = 0; i + 1 < values.length; i += 2) out.push({ x: values[i], y: values[i + 1] })
	return out
}

/**
 * The points an absolute SVG path passes through, control points included. Pele draws edges as
 * straight runs joined by small rounded corners (`M…L…C…L`), so the control points sit on the
 * corners the route turns at, which is what the bend estimate needs. Relative commands only
 * appear in node outlines, where an approximate extent is enough.
 */
export function parsePathPoints(d: string): Vec2[] {
	const out: Vec2[] = []
	let current: Vec2 = { x: 0, y: 0 }
	for (const [, command, args] of d.matchAll(
		/([MLCQSTHVAZmlcqsthvaz])([^MLCQSTHVAZmlcqsthvaz]*)/g
	)) {
		const values = args.match(/-?[\d.]+(?:e[+-]?\d+)?/gi)?.map(Number) ?? []
		switch (command) {
			case 'H':
				for (const x of values) out.push((current = { x, y: current.y }))
				break
			case 'V':
				for (const y of values) out.push((current = { x: current.x, y }))
				break
			case 'A':
				for (let i = 0; i + 6 < values.length; i += 7) {
					out.push((current = { x: values[i + 5], y: values[i + 6] }))
				}
				break
			case 'M':
			case 'L':
			case 'C':
			case 'Q':
			case 'S':
			case 'T':
				for (let i = 0; i + 1 < values.length; i += 2) {
					out.push((current = { x: values[i], y: values[i + 1] }))
				}
				break
			default:
				for (let i = 0; i + 1 < values.length; i += 2) {
					out.push((current = { x: current.x + values[i], y: current.y + values[i + 1] }))
				}
		}
	}
	return out
}
