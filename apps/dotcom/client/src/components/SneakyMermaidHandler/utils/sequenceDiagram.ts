import type { Actor, Message } from 'mermaid/dist/diagrams/sequence/types.js'
import {
	createShapeId,
	Editor,
	IndexKey,
	TLGeoShape,
	TLLineShape,
	TLShapeId,
	toRichText,
} from 'tldraw'
import {
	getFragmentStartKeyword,
	isBidirectional,
	isFragmentEnd,
	isNoteMessage,
	isSignalMessage,
	mapLineTypeToArrowProps,
	mapParticipantTypeToGeo,
	type MermaidLinetype,
	type MermaidPlacement,
} from './mappings'
import { getAccumulatedTranslate, mountSvg } from './svgParsing'
import { sanitizeDiagramText } from './utils'

// Target center-to-center spacing between adjacent actors in tldraw units
const TARGET_ACTOR_SPACING = 300
// Minimum vertical gap between bottom edge of top actors and top edge of bottom actors
const MIN_VERTICAL_GAP = 400

// Fallback constants used when SVG parsing yields no results (e.g. jsdom)
const FALLBACK_ACTOR_WIDTH = 200
const FALLBACK_ACTOR_HEIGHT = 70
const FALLBACK_ACTOR_SPACING = 100

const NOTE_W = 160
const NOTE_H = 50
const NOTE_PAD = 20
const FRAG_PAD_X = 30
const FRAG_PAD_TOP = 50
const FRAG_PAD_BOTTOM = 25
const ACTOR_PAD_W = 30
const ACTOR_PAD_H = 10
const SELF_MSG_Y_OFFSET = 0.04
const SELF_MSG_BEND = -80

interface SvgRect {
	x: number
	y: number
	w: number
	h: number
}

function num(v: number, fallback: number): number {
	return Number.isFinite(v) ? v : fallback
}

/** Parse actor rects from Mermaid sequence diagram SVG, split into top/bottom rows. */
function parseActorRows(root: Element, n: number): { top: SvgRect[]; bottom: SvgRect[] } {
	function parseRects(selector: string): SvgRect[] {
		const results: SvgRect[] = []
		for (const rect of root.querySelectorAll(selector)) {
			const ancestor = getAccumulatedTranslate(rect)
			const x = num(ancestor.x + parseFloat(rect.getAttribute('x') || '0'), 0)
			const y = num(ancestor.y + parseFloat(rect.getAttribute('y') || '0'), 0)
			const w = parseFloat(rect.getAttribute('width') || '0')
			const h = parseFloat(rect.getAttribute('height') || '0')
			if (w > 0 && h > 0) results.push({ x, y, w, h })
		}
		results.sort((a, b) => a.x - b.x)
		return results
	}

	const top = parseRects('rect.actor-top')
	const bottom = parseRects('rect.actor-bottom')
	if (top.length >= n && bottom.length >= n) {
		return { top: top.slice(0, n), bottom: bottom.slice(0, n) }
	}

	// Fallback: try all actor rects and split at largest Y gap
	const all = parseRects('rect[class*="actor"]')
	if (all.length >= 2 * n) {
		const sorted = [...all].sort((a, b) => a.y - b.y)
		let maxGap = 0
		let splitAt = n
		for (let i = 1; i < sorted.length; i++) {
			const gap = sorted[i].y - sorted[i - 1].y
			if (gap > maxGap) {
				maxGap = gap
				splitAt = i
			}
		}
		return {
			top: sorted
				.slice(0, splitAt)
				.sort((a, b) => a.x - b.x)
				.slice(0, n),
			bottom: sorted
				.slice(splitAt)
				.sort((a, b) => a.x - b.x)
				.slice(0, n),
		}
	}

	return { top: [], bottom: [] }
}

export function createMermaidSequenceDiagram(
	editor: Editor,
	svgString: string,
	actors: Map<string, Actor>,
	actorKeys: string[],
	messages: Message[],
	LT: MermaidLinetype,
	PL: MermaidPlacement
) {
	const vp = editor.getViewportPageBounds().center
	const n = actorKeys.length

	// Per-actor placement arrays (parallel to actorKeys)
	const topX: number[] = []
	const topY: number[] = []
	const topW: number[] = []
	const topH: number[] = []
	const botX: number[] = []
	const botY: number[] = []
	const botW: number[] = []
	const botH: number[] = []

	let usedSvg = false
	try {
		const { root, cleanup } = mountSvg(svgString)
		const rows = parseActorRows(root, n)
		cleanup()

		if (rows.top.length >= n && rows.bottom.length >= n) {
			// Use box sizes from SVG but recompute X positions with uniform spacing.
			// Mermaid inflates X gaps to fit message labels; we don't need that.
			const maxTopW = Math.max(...rows.top.map((r) => r.w))
			const totalWidth = (n - 1) * TARGET_ACTOR_SPACING + maxTopW
			const startX = vp.x - totalWidth / 2

			// Enforce minimum vertical gap between top and bottom actor rows
			const topBottomEdge = Math.max(...rows.top.map((r) => r.y + r.h))
			const botTopEdge = Math.min(...rows.bottom.map((r) => r.y))
			const svgGap = botTopEdge - topBottomEdge
			const yStretch = svgGap < MIN_VERTICAL_GAP ? MIN_VERTICAL_GAP - svgGap : 0

			const topMinY = Math.min(...rows.top.map((r) => r.y))
			const botMaxY = Math.max(...rows.bottom.map((r) => r.y + r.h)) + yStretch
			const oy = vp.y - (botMaxY + topMinY) / 2

			for (let i = 0; i < n; i++) {
				const t = rows.top[i]
				const b = rows.bottom[i]
				const cx = startX + i * TARGET_ACTOR_SPACING
				const tw = t.w + ACTOR_PAD_W
				const th = t.h + ACTOR_PAD_H
				const bw = b.w + ACTOR_PAD_W
				const bh = b.h + ACTOR_PAD_H
				topX.push(cx - tw / 2)
				topY.push(oy + t.y)
				topW.push(tw)
				topH.push(th)
				botX.push(cx - bw / 2)
				botY.push(oy + b.y + yStretch)
				botW.push(bw)
				botH.push(bh)
			}
			usedSvg = true
		}
	} catch {
		// SVG parsing failed — fall through to computed layout
	}

	if (!usedSvg) {
		const totalWidth = n * FALLBACK_ACTOR_WIDTH + (n - 1) * FALLBACK_ACTOR_SPACING
		const totalHeight = FALLBACK_ACTOR_HEIGHT * 2 + 300

		const startX = vp.x - totalWidth / 2
		const startY = vp.y - totalHeight / 2
		const bottomY = startY + totalHeight - FALLBACK_ACTOR_HEIGHT

		for (let i = 0; i < n; i++) {
			const x = startX + i * (FALLBACK_ACTOR_WIDTH + FALLBACK_ACTOR_SPACING)
			topX.push(x)
			topY.push(startY)
			topW.push(FALLBACK_ACTOR_WIDTH)
			topH.push(FALLBACK_ACTOR_HEIGHT)
			botX.push(x)
			botY.push(bottomY)
			botW.push(FALLBACK_ACTOR_WIDTH)
			botH.push(FALLBACK_ACTOR_HEIGHT)
		}
	}

	// --- create actor shapes, lifelines, and group them per participant ---

	const topActorShapeIds = new Map<string, TLShapeId>()
	const lifelineShapeIds = new Map<string, TLShapeId>()
	const effectiveTopH: number[] = new Array(n).fill(0)

	for (let i = 0; i < n; i++) {
		const key = actorKeys[i]
		const actor = actors.get(key)
		if (!actor) continue

		const topId = createShapeId()
		topActorShapeIds.set(key, topId)
		editor.createShape<TLGeoShape>({
			id: topId,
			type: 'geo',
			x: topX[i],
			y: topY[i],
			props: {
				geo: mapParticipantTypeToGeo(actor.type),
				w: topW[i],
				h: topH[i],
				richText: toRichText(sanitizeDiagramText(actor.description || actor.name || key)),
				align: 'middle',
				verticalAlign: 'middle',
				size: 's',
			},
		})

		// GeoShape auto-grows (growY) when text doesn't fit the specified h.
		// Use the effective rendered height so the lifeline starts at the visual bottom.
		const createdTop = editor.getShape<TLGeoShape>(topId)
		effectiveTopH[i] = createdTop ? createdTop.props.h + createdTop.props.growY : topH[i]

		const lifelineH = botY[i] - (topY[i] + effectiveTopH[i])
		if (lifelineH <= 0) continue

		const lifelineId = createShapeId()
		lifelineShapeIds.set(key, lifelineId)
		editor.createShape<TLLineShape>({
			id: lifelineId,
			type: 'line',
			x: topX[i] + topW[i] / 2,
			y: topY[i] + effectiveTopH[i],
			props: {
				dash: 'solid',
				size: 's',
				color: 'black',
				spline: 'line',
				points: {
					a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
					a2: { id: 'a2', index: 'a2' as IndexKey, x: 0, y: lifelineH },
				},
			},
		})

		const bottomId = createShapeId()
		editor.createShape<TLGeoShape>({
			id: bottomId,
			type: 'geo',
			x: botX[i],
			y: botY[i],
			props: {
				geo: mapParticipantTypeToGeo(actor.type),
				w: botW[i],
				h: botH[i],
				richText: toRichText(sanitizeDiagramText(actor.description || actor.name || key)),
				align: 'middle',
				verticalAlign: 'middle',
				size: 's',
			},
		})

		editor.groupShapes([topId, lifelineId, bottomId])
	}

	// --- extract combined fragments (loop, opt, alt, etc.) and events ---

	interface Fragment {
		keyword: string
		title: string
		firstEventIdx: number
		lastEventIdx: number
		actorKeys: Set<string>
	}

	const fragments: Fragment[] = []
	const fragmentStack: {
		keyword: string
		title: string
		firstEventIdx: number
		actorKeys: Set<string>
	}[] = []
	const events: Message[] = []

	for (const msg of messages) {
		const keyword = getFragmentStartKeyword(msg.type, LT)
		if (keyword) {
			fragmentStack.push({
				keyword,
				title: typeof msg.message === 'string' ? sanitizeDiagramText(msg.message) : '',
				firstEventIdx: events.length,
				actorKeys: new Set(),
			})
			continue
		}
		if (isFragmentEnd(msg.type, LT)) {
			const frag = fragmentStack.pop()
			if (frag) {
				fragments.push({ ...frag, lastEventIdx: events.length - 1 })
			}
			continue
		}
		const isEvent =
			(isSignalMessage(msg.type, LT) && msg.from && msg.to) ||
			(isNoteMessage(msg.type, LT) && msg.from)
		if (isEvent) {
			for (const frag of fragmentStack) {
				if (msg.from) frag.actorKeys.add(msg.from)
				if (msg.to) frag.actorKeys.add(msg.to)
			}
			events.push(msg)
		}
	}

	const totalEvents = events.length
	const firstLifelineTop = topY[0] + effectiveTopH[0]
	const firstLifelineH = botY[0] - firstLifelineTop

	function eventYAt(evIdx: number): number {
		return firstLifelineTop + firstLifelineH * ((evIdx + 1) / (totalEvents + 1))
	}

	// --- create fragment boxes (behind events) ---

	for (const frag of fragments) {
		if (frag.lastEventIdx < frag.firstEventIdx) continue

		const fragTopY = eventYAt(frag.firstEventIdx) - FRAG_PAD_TOP
		const fragBotY = eventYAt(frag.lastEventIdx) + FRAG_PAD_BOTTOM

		const involvedIndices = [...frag.actorKeys]
			.map((k) => actorKeys.indexOf(k))
			.filter((i) => i >= 0)
		if (involvedIndices.length === 0) continue

		const minIdx = Math.min(...involvedIndices)
		const maxIdx = Math.max(...involvedIndices)
		const fragLeftX = topX[minIdx] - FRAG_PAD_X
		const fragRightX = topX[maxIdx] + topW[maxIdx] + FRAG_PAD_X

		editor.createShape<TLGeoShape>({
			id: createShapeId(),
			type: 'geo',
			x: fragLeftX,
			y: fragTopY,
			props: {
				geo: 'rectangle',
				w: fragRightX - fragLeftX,
				h: fragBotY - fragTopY,
				dash: 'dashed',
				fill: 'none',
				color: 'light-blue',
				size: 's',
				align: 'start',
				verticalAlign: 'start',
				richText: toRichText(`${frag.keyword} [${frag.title}]`),
			},
		})
	}

	// --- events: signals (arrows) and notes (geo shapes) ---

	for (let evIdx = 0; evIdx < totalEvents; evIdx++) {
		const msg = events[evIdx]
		const anchorY = (evIdx + 1) / (totalEvents + 1)
		const eventY = eventYAt(evIdx)

		if (isSignalMessage(msg.type, LT)) {
			const fromKey = msg.from!
			const toKey = msg.to!
			const fromLifeline = lifelineShapeIds.get(fromKey)
			const toLifeline = lifelineShapeIds.get(toKey)
			if (!fromLifeline || !toLifeline) continue

			const fromIdx = actorKeys.indexOf(fromKey)
			const toIdx = actorKeys.indexOf(toKey)
			if (fromIdx < 0 || toIdx < 0) continue

			const { dash, arrowheadEnd } = mapLineTypeToArrowProps(msg.type ?? LT.SOLID, LT)
			const label = typeof msg.message === 'string' ? sanitizeDiagramText(msg.message) : undefined
			const arrowId = createShapeId()
			const fromCx = topX[fromIdx] + topW[fromIdx] / 2
			const toCx = topX[toIdx] + topW[toIdx] / 2
			const isSelf = fromKey === toKey

			if (isSelf) {
				// Self-message: arrow loops back to the same lifeline
				const startAnchor = anchorY - SELF_MSG_Y_OFFSET
				const endAnchor = anchorY + SELF_MSG_Y_OFFSET
				editor.createShape({
					id: arrowId,
					type: 'arrow',
					x: fromCx,
					y: eventY - 15,
					props: {
						dash,
						arrowheadEnd,
						arrowheadStart: 'none',
						start: { x: 0, y: 0 },
						end: { x: 0, y: 30 },
						bend: SELF_MSG_BEND,
						size: 's',
						...(label ? { richText: toRichText(label) } : {}),
					},
				})
				editor.createBindings([
					{
						fromId: arrowId,
						toId: fromLifeline,
						type: 'arrow',
						props: {
							terminal: 'start',
							normalizedAnchor: { x: 0.5, y: startAnchor },
							isExact: true,
							isPrecise: true,
						},
					},
					{
						fromId: arrowId,
						toId: toLifeline,
						type: 'arrow',
						props: {
							terminal: 'end',
							normalizedAnchor: { x: 0.5, y: endAnchor },
							isExact: true,
							isPrecise: true,
						},
					},
				])
			} else {
				editor.createShape({
					id: arrowId,
					type: 'arrow',
					x: Math.min(fromCx, toCx),
					y: eventY,
					props: {
						dash,
						arrowheadEnd,
						arrowheadStart: isBidirectional(msg.type ?? LT.SOLID, LT) ? 'arrow' : 'none',
						start: { x: fromCx - Math.min(fromCx, toCx), y: 0 },
						end: { x: toCx - Math.min(fromCx, toCx), y: 0 },
						...(label ? { richText: toRichText(label) } : {}),
					},
				})
				editor.createBindings([
					{
						fromId: arrowId,
						toId: fromLifeline,
						type: 'arrow',
						props: {
							terminal: 'start',
							normalizedAnchor: { x: 0.5, y: anchorY },
							isExact: true,
							isPrecise: true,
						},
					},
					{
						fromId: arrowId,
						toId: toLifeline,
						type: 'arrow',
						props: {
							terminal: 'end',
							normalizedAnchor: { x: 0.5, y: anchorY },
							isExact: true,
							isPrecise: true,
						},
					},
				])
			}
		} else if (isNoteMessage(msg.type, LT)) {
			const fromKey = msg.from!
			const toKey = msg.to ?? fromKey
			const fromIdx = actorKeys.indexOf(fromKey)
			const toIdx = actorKeys.indexOf(toKey)
			if (fromIdx < 0) continue

			const label = typeof msg.message === 'string' ? sanitizeDiagramText(msg.message) : undefined
			const placement = msg.placement as unknown as number | undefined

			const fromCx = topX[fromIdx] + topW[fromIdx] / 2
			const toCx = toIdx >= 0 ? topX[toIdx] + topW[toIdx] / 2 : fromCx
			const isSpanning = placement === PL.OVER && fromKey !== toKey && toIdx >= 0
			const noteW = isSpanning ? Math.max(NOTE_W, Math.abs(toCx - fromCx) + NOTE_PAD * 2) : NOTE_W

			let noteX: number
			if (placement === PL.LEFTOF) {
				noteX = fromCx - noteW - NOTE_PAD
			} else if (placement === PL.RIGHTOF) {
				noteX = fromCx + NOTE_PAD
			} else if (isSpanning) {
				noteX = (fromCx + toCx) / 2 - noteW / 2
			} else {
				noteX = fromCx - noteW / 2
			}

			editor.createShape<TLGeoShape>({
				id: createShapeId(),
				type: 'geo',
				x: noteX,
				y: eventY - NOTE_H / 2,
				props: {
					geo: 'rectangle',
					w: noteW,
					h: NOTE_H,
					fill: 'solid',
					color: 'yellow',
					dash: 'draw',
					size: 's',
					align: 'middle',
					verticalAlign: 'middle',
					...(label ? { richText: toRichText(label) } : {}),
				},
			})
		}
	}
}
