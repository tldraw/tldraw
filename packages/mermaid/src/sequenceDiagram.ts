import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import type { Actor, Message } from 'mermaid/dist/diagrams/sequence/types.js'
import { TLArrowShapeArrowheadStyle, TLDefaultDashStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
	MermaidBlueprintLineNode,
	MermaidNodeRenderMapper,
} from './blueprint'
import { parseRgbToTldrawColor } from './colors'
import { resolveMermaidNodeRender } from './defaultMermaidNodeRenderSpec'
import { getAccumulatedTranslate } from './svgParsing'

export interface SvgRect {
	x: number
	y: number
	w: number
	h: number
}

export interface ActorLayout {
	x: number
	y: number
	w: number
	h: number
	bottomY: number
}

export interface ParsedSequenceLayout {
	actorLayouts: ActorLayout[]
	noteRects: SvgRect[]
}

const LINETYPE = {
	SOLID: 0,
	DOTTED: 1,
	NOTE: 2,
	SOLID_CROSS: 3,
	DOTTED_CROSS: 4,
	SOLID_OPEN: 5,
	DOTTED_OPEN: 6,
	LOOP_START: 10,
	LOOP_END: 11,
	ALT_START: 12,
	ALT_ELSE: 13,
	ALT_END: 14,
	OPT_START: 15,
	OPT_END: 16,
	ACTIVE_START: 17,
	ACTIVE_END: 18,
	PAR_START: 19,
	PAR_AND: 20,
	PAR_END: 21,
	RECT_START: 22,
	RECT_END: 23,
	SOLID_POINT: 24,
	DOTTED_POINT: 25,
	AUTONUMBER: 26,
	CRITICAL_START: 27,
	CRITICAL_OPTION: 28,
	CRITICAL_END: 29,
	BREAK_START: 30,
	BREAK_END: 31,
	PAR_OVER_START: 32,
	BIDIRECTIONAL_SOLID: 33,
	BIDIRECTIONAL_DOTTED: 34,
} as const satisfies SequenceDB['LINETYPE']

const PLACEMENT = {
	LEFTOF: 0,
	RIGHTOF: 1,
	OVER: 2,
} as const satisfies SequenceDB['PLACEMENT']

const signalTypes: number[] = [
	LINETYPE.SOLID,
	LINETYPE.DOTTED,
	LINETYPE.SOLID_CROSS,
	LINETYPE.DOTTED_CROSS,
	LINETYPE.SOLID_OPEN,
	LINETYPE.DOTTED_OPEN,
	LINETYPE.SOLID_POINT,
	LINETYPE.DOTTED_POINT,
	LINETYPE.BIDIRECTIONAL_SOLID,
	LINETYPE.BIDIRECTIONAL_DOTTED,
]

function isSignalMessage(type: number | undefined): boolean {
	if (type === undefined) return false
	return signalTypes.includes(type)
}

function isNoteMessage(type: number | undefined): boolean {
	return type === LINETYPE.NOTE
}

function isActiveStart(type: number | undefined): boolean {
	return type === LINETYPE.ACTIVE_START
}

function isActiveEnd(type: number | undefined): boolean {
	return type === LINETYPE.ACTIVE_END
}

function isAutonumber(type: number | undefined): boolean {
	return type === LINETYPE.AUTONUMBER
}

/** Returns the fragment keyword (e.g. "loop", "opt") if this message starts a combined fragment, or null. */
function getFragmentStartKeyword(type: number | undefined): string | null {
	if (type === undefined) return null
	if (type === LINETYPE.LOOP_START) return 'loop'
	if (type === LINETYPE.ALT_START) return 'alt'
	if (type === LINETYPE.OPT_START) return 'opt'
	if (type === LINETYPE.PAR_START) return 'par'
	if (type === LINETYPE.RECT_START) return 'rect'
	if (type === LINETYPE.CRITICAL_START) return 'critical'
	if (type === LINETYPE.BREAK_START) return 'break'
	if (type === LINETYPE.PAR_OVER_START) return 'par'
	return null
}

function isFragmentEnd(type: number | undefined): boolean {
	if (type === undefined) return false
	const endTypes: number[] = [
		LINETYPE.LOOP_END,
		LINETYPE.ALT_END,
		LINETYPE.OPT_END,
		LINETYPE.PAR_END,
		LINETYPE.RECT_END,
		LINETYPE.CRITICAL_END,
		LINETYPE.BREAK_END,
	]
	return endTypes.includes(type)
}

/** Returns a keyword if this message is a section separator within a combined fragment, or null. */
function getFragmentSeparatorKeyword(type: number | undefined): string | null {
	if (type === LINETYPE.ALT_ELSE) return 'else'
	if (type === LINETYPE.PAR_AND) return 'and'
	if (type === LINETYPE.CRITICAL_OPTION) return 'option'
	return null
}

/** Map a Mermaid LINETYPE value to tldraw arrow props. */
function mapLineTypeToArrowProps(type: number): {
	dash: TLDefaultDashStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
} {
	switch (type) {
		case LINETYPE.SOLID:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case LINETYPE.DOTTED:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case LINETYPE.SOLID_CROSS:
			return { dash: 'solid', arrowheadEnd: 'bar' }
		case LINETYPE.DOTTED_CROSS:
			return { dash: 'dotted', arrowheadEnd: 'bar' }
		case LINETYPE.SOLID_OPEN:
			return { dash: 'solid', arrowheadEnd: 'none' }
		case LINETYPE.DOTTED_OPEN:
			return { dash: 'dotted', arrowheadEnd: 'none' }
		case LINETYPE.SOLID_POINT:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case LINETYPE.DOTTED_POINT:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case LINETYPE.BIDIRECTIONAL_SOLID:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case LINETYPE.BIDIRECTIONAL_DOTTED:
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		default:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
	}
}

function isBidirectional(type: number): boolean {
	return type === LINETYPE.BIDIRECTIONAL_SOLID || type === LINETYPE.BIDIRECTIONAL_DOTTED
}

const TARGET_ACTOR_SPACING = 300
const MIN_VERTICAL_GAP = 400
const FALLBACK_ACTOR_WIDTH = 200
const FALLBACK_ACTOR_HEIGHT = 70
const FALLBACK_ACTOR_SPACING = 100
const FALLBACK_EVENT_SPACING = 80
const FALLBACK_NOTE_WIDTH = 120
const FALLBACK_NOTE_HEIGHT = 50
const NOTE_PADDING = 5
// tldraw's hand-drawn font is wider than Mermaid's default, so we estimate
// the minimum note width from the label text to prevent wrapping.
const NOTE_CHAR_WIDTH = 11
const NOTE_TEXT_PADDING = 40
const FRAGMENT_PADDING_X = 30
const FRAGMENT_PADDING_TOP = 50
const FRAGMENT_PADDING_BOTTOM = 25
const ACTOR_PADDING_WIDTH = 30
const ACTOR_PADDING_HEIGHT = 10
const SELF_MSG_Y_OFFSET = 0.04
const SELF_MSG_BEND = -80
const ACTIVATION_BOX_WIDTH = 20
const ACTIVATION_NEST_OFFSET = 6
const ACTIVATION_PAD_RATIO = 0.15
const FRAGMENT_SECTION_LABEL_HEIGHT = 25
const FRAGMENT_SECTION_LABEL_PADDING = 5

interface FragmentSection {
	title: string
	firstEventIndex: number
}

interface OpenFragment {
	keyword: string
	sections: FragmentSection[]
	firstEventIndex: number
	actorKeys: Set<string>
}

interface FragmentSpan extends OpenFragment {
	lastEventIndex: number
}

interface ActivationSpan {
	participantKey: string
	startEventIndex: number
	endEventIndex: number
}

function parseSvgRects(root: Element, selector: string): SvgRect[] {
	const results: SvgRect[] = []
	for (const rect of root.querySelectorAll(selector)) {
		const ancestor = getAccumulatedTranslate(rect)
		const x = parseFloat(rect.getAttribute('x') || '0')
		const y = parseFloat(rect.getAttribute('y') || '0')
		const w = parseFloat(rect.getAttribute('width') || '0')
		const h = parseFloat(rect.getAttribute('height') || '0')
		if (w > 0 && h > 0) {
			results.push({
				x: Number.isFinite(ancestor.x + x) ? ancestor.x + x : 0,
				y: Number.isFinite(ancestor.y + y) ? ancestor.y + y : 0,
				w,
				h,
			})
		}
	}
	return results
}

/**
 * Stick-figure (actor) participants use SVG <line> elements instead of <rect>.
 * We derive bounding rectangles from the min/max coordinates of each actor-man group.
 */
function parseActorManRects(root: Element): SvgRect[] {
	const results: SvgRect[] = []
	for (const group of root.querySelectorAll('g.actor-man')) {
		const ancestor = getAccumulatedTranslate(group)
		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		for (const line of group.querySelectorAll('line')) {
			for (const attr of ['x1', 'x2']) {
				const coord = parseFloat(line.getAttribute(attr) || '0')
				if (coord < minX) minX = coord
				if (coord > maxX) maxX = coord
			}
			for (const attr of ['y1', 'y2']) {
				const coord = parseFloat(line.getAttribute(attr) || '0')
				if (coord < minY) minY = coord
				if (coord > maxY) maxY = coord
			}
		}
		if (Number.isFinite(minX) && Number.isFinite(minY)) {
			results.push({
				x: ancestor.x + minX,
				y: ancestor.y + minY,
				w: maxX - minX || FALLBACK_ACTOR_WIDTH,
				h: maxY - minY || FALLBACK_ACTOR_HEIGHT,
			})
		}
	}
	return results
}

function computeActorLayouts(root: Element, actorCount: number, eventCount: number): ActorLayout[] {
	const byX = (a: SvgRect, b: SvgRect) => a.x - b.x
	let top = parseSvgRects(root, 'rect.actor-top').sort(byX)
	let bottom = parseSvgRects(root, 'rect.actor-bottom').sort(byX)

	const actorManRects = parseActorManRects(root).sort(byX)
	if (actorManRects.length > 0 && (top.length < actorCount || bottom.length < actorCount)) {
		const midY =
			top.length > 0 && bottom.length > 0
				? (Math.max(...top.map((r) => r.y + r.h)) + Math.min(...bottom.map((r) => r.y))) / 2
				: actorManRects.length >= 2
					? (actorManRects[0].y + actorManRects[actorManRects.length - 1].y) / 2
					: 0
		for (const rect of actorManRects) {
			if (rect.y < midY) top.push(rect)
			else bottom.push(rect)
		}
		top.sort(byX)
		bottom.sort(byX)
	}

	if (top.length < actorCount || bottom.length < actorCount) {
		const all = parseSvgRects(root, 'rect[class*="actor"]').sort((a, b) => a.y - b.y)
		if (all.length >= 2 * actorCount) {
			let maxGap = 0
			let splitAt = actorCount
			for (let i = 1; i < all.length; i++) {
				const gap = all[i].y - all[i - 1].y
				if (gap > maxGap) {
					maxGap = gap
					splitAt = i
				}
			}
			top = all.slice(0, splitAt).sort(byX).slice(0, actorCount)
			bottom = all.slice(splitAt).sort(byX).slice(0, actorCount)
		} else {
			top = []
			bottom = []
		}
	} else {
		top = top.slice(0, actorCount)
		bottom = bottom.slice(0, actorCount)
	}

	if (actorManRects.length > 0) {
		const actorManSet = new Set<SvgRect>(actorManRects)
		const regularTops = top.filter((r) => !actorManSet.has(r))
		const regularBottoms = bottom.filter((r) => !actorManSet.has(r))
		const refHeight =
			regularTops.length > 0 ? Math.max(...regularTops.map((r) => r.h)) : FALLBACK_ACTOR_HEIGHT
		const refWidth =
			regularTops.length > 0 ? Math.max(...regularTops.map((r) => r.w)) : FALLBACK_ACTOR_WIDTH
		const refTopY = regularTops.length > 0 ? Math.min(...regularTops.map((r) => r.y)) : undefined
		const refBottomEndY =
			regularBottoms.length > 0 ? Math.max(...regularBottoms.map((r) => r.y + r.h)) : undefined

		for (const rect of top) {
			if (!actorManSet.has(rect)) continue
			const centerY = rect.y + rect.h / 2
			rect.h = refHeight
			rect.w = Math.max(rect.w, refWidth)
			rect.y = refTopY !== undefined ? refTopY : centerY - refHeight / 2
		}
		for (const rect of bottom) {
			if (!actorManSet.has(rect)) continue
			const centerY = rect.y + rect.h / 2
			rect.h = refHeight
			rect.w = Math.max(rect.w, refWidth)
			rect.y = refBottomEndY !== undefined ? refBottomEndY - refHeight : centerY - refHeight / 2
		}
	}

	if (top.length >= actorCount && bottom.length >= actorCount) {
		const svgCenters = top.map((r) => r.x + r.w / 2)
		const spacings: number[] = []
		for (let i = 1; i < svgCenters.length; i++) {
			spacings.push(svgCenters[i] - svgCenters[i - 1])
		}
		const minSpacing = spacings.length > 0 ? Math.min(...spacings) : 1
		const scale = Math.max(1, TARGET_ACTOR_SPACING / minSpacing)

		const xCenters = svgCenters.map((c) => (c - svgCenters[0]) * scale)
		const totalSpan = xCenters.length > 1 ? xCenters[xCenters.length - 1] : 0

		const topRowBottom = Math.max(...top.map((r) => r.y + r.h))
		const bottomRowTop = Math.min(...bottom.map((r) => r.y))
		const yStretch = Math.max(0, MIN_VERTICAL_GAP - (bottomRowTop - topRowBottom))
		const topMinY = Math.min(...top.map((r) => r.y))
		const bottomMaxY = Math.max(...bottom.map((r) => r.y + r.h))
		const originY = -(bottomMaxY + yStretch + topMinY) / 2

		return top.map((topRect, i) => {
			const w = topRect.w + ACTOR_PADDING_WIDTH
			const h = topRect.h + ACTOR_PADDING_HEIGHT
			return {
				x: xCenters[i] - totalSpan / 2 - w / 2,
				y: originY + topRect.y,
				w,
				h,
				bottomY: originY + bottom[i].y + yStretch,
			}
		})
	}

	const fallbackLifelineHeight = Math.max(300, eventCount * FALLBACK_EVENT_SPACING)
	const totalWidth = actorCount * FALLBACK_ACTOR_WIDTH + (actorCount - 1) * FALLBACK_ACTOR_SPACING
	const totalHeight = FALLBACK_ACTOR_HEIGHT * 2 + fallbackLifelineHeight
	const startX = -totalWidth / 2
	const startY = -totalHeight / 2
	return Array.from({ length: actorCount }, (_, i) => ({
		x: startX + i * (FALLBACK_ACTOR_WIDTH + FALLBACK_ACTOR_SPACING),
		y: startY,
		w: FALLBACK_ACTOR_WIDTH,
		h: FALLBACK_ACTOR_HEIGHT,
		bottomY: startY + totalHeight - FALLBACK_ACTOR_HEIGHT,
	}))
}

function getMessageLabel(msg: Message): string | undefined {
	return typeof msg.message === 'string' ? msg.message : undefined
}

/** Count how many renderable events (signals + notes) a message list contains. */
export function countSequenceEvents(messages: Message[]): number {
	let count = 0
	for (const msg of messages) {
		if (isAutonumber(msg.type)) continue
		if (getFragmentStartKeyword(msg.type)) continue
		if (isFragmentEnd(msg.type)) continue
		if (getFragmentSeparatorKeyword(msg.type)) continue
		if (isActiveStart(msg.type) || isActiveEnd(msg.type)) continue
		const isEvent =
			(isSignalMessage(msg.type) && msg.from && msg.to) || (isNoteMessage(msg.type) && msg.from)
		if (isEvent) count++
	}
	return count
}

/** Parse sequence-diagram SVG layout data for use by {@link sequenceToBlueprint}. */
export function parseSequenceLayout(
	root: Element,
	actorCount: number,
	eventCount: number
): ParsedSequenceLayout {
	return {
		actorLayouts: computeActorLayouts(root, actorCount, eventCount),
		noteRects: parseSvgRects(root, 'rect.note'),
	}
}

export interface SequenceToBlueprintOptions {
	mapNodeToRenderSpec?: MermaidNodeRenderMapper
}

/**
 * Build a complete blueprint for a sequence diagram:
 * top actors, lifelines, bottom actors, fragments, notes, and signal edges.
 */
export function sequenceToBlueprint(
	layout: ParsedSequenceLayout,
	actors: Map<string, Actor>,
	actorKeys: string[],
	messages: Message[],
	createdActors: Map<string, number> = new Map(),
	destroyedActors: Map<string, number> = new Map(),
	options?: SequenceToBlueprintOptions
): DiagramMermaidBlueprint {
	const mapNode = options?.mapNodeToRenderSpec
	const actorCount = actorKeys.length
	const keyIndex = new Map(actorKeys.map((key, i) => [key, i]))

	const fragments: FragmentSpan[] = []
	const fragmentStack: OpenFragment[] = []
	const events: Message[] = []
	const activationStack = new Map<string, number[]>()
	const activationSpans: ActivationSpan[] = []

	let autonumberStart = 0
	let autonumberStep = 0
	let autonumberVisible = false

	for (const msg of messages) {
		if (isAutonumber(msg.type)) {
			autonumberStart = 1
			autonumberStep = 1
			autonumberVisible = true
			continue
		}

		const keyword = getFragmentStartKeyword(msg.type)
		if (keyword) {
			fragmentStack.push({
				keyword,
				sections: [{ title: getMessageLabel(msg) ?? '', firstEventIndex: events.length }],
				firstEventIndex: events.length,
				actorKeys: new Set(),
			})
			continue
		}

		if (isFragmentEnd(msg.type)) {
			const frag = fragmentStack.pop()
			if (frag) fragments.push({ ...frag, lastEventIndex: events.length - 1 })
			continue
		}

		if (getFragmentSeparatorKeyword(msg.type)) {
			const current = fragmentStack[fragmentStack.length - 1]
			if (current) {
				current.sections.push({
					title: getMessageLabel(msg) ?? '',
					firstEventIndex: events.length,
				})
			}
			continue
		}

		if (isActiveStart(msg.type)) {
			const key = msg.from ?? msg.to
			if (key) {
				if (!activationStack.has(key)) activationStack.set(key, [])
				// Explicit `activate` follows the triggering arrow,
				// so the activation starts at the previous event.
				activationStack.get(key)!.push(Math.max(0, events.length - 1))
			}
			continue
		}

		if (isActiveEnd(msg.type)) {
			const key = msg.from ?? msg.to
			if (key) {
				const startIdx = activationStack.get(key)?.pop()
				if (startIdx !== undefined) {
					activationSpans.push({
						participantKey: key,
						startEventIndex: startIdx,
						endEventIndex: Math.max(events.length - 1, startIdx),
					})
				}
			}
			continue
		}

		const isEvent =
			(isSignalMessage(msg.type) && msg.from && msg.to) || (isNoteMessage(msg.type) && msg.from)
		if (!isEvent) continue

		for (const frag of fragmentStack) {
			if (msg.from) frag.actorKeys.add(msg.from)
			if (msg.to) frag.actorKeys.add(msg.to)
		}
		events.push(msg)
	}

	const layouts = layout.actorLayouts

	// Pre-compute lifecycle event indices for created/destroyed actors.
	// We scan events for the first signal targeting each created actor
	// and the first signal from each destroyed actor.
	const creationEventIndex = new Map<string, number>()
	const destructionEventIndex = new Map<string, number>()
	for (let i = 0; i < events.length; i++) {
		const ev = events[i]
		if (!isSignalMessage(ev.type)) continue

		if (ev.to && createdActors.has(ev.to) && !creationEventIndex.has(ev.to)) {
			creationEventIndex.set(ev.to, i)
		}
		if (ev.from && destroyedActors.has(ev.from) && !destructionEventIndex.has(ev.from)) {
			destructionEventIndex.set(ev.from, i)
		}
	}

	// Build blueprint
	const svgNoteRects = layout.noteRects
	let svgNoteIndex = 0
	const nodes: MermaidBlueprintNode[] = []
	const lines: MermaidBlueprintLineNode[] = []
	const edges: MermaidBlueprintEdge[] = []

	const { y: firstY, h: firstH, bottomY: firstBottomY } = layouts[0]
	const lifelineTop = firstY + firstH
	const eventStep = (firstBottomY - lifelineTop) / (events.length + 1)

	// --- Z-order: lifelines -> activations -> fragments -> actor boxes -> notes/arrows ---

	// 1. Lifelines (behind everything)
	for (let i = 0; i < actorCount; i++) {
		const key = actorKeys[i]
		const { x, y, w, h, bottomY } = layouts[i]

		const isCreated = creationEventIndex.has(key)
		const isDestroyed = destructionEventIndex.has(key)
		const eventY = isCreated ? lifelineTop + eventStep * (creationEventIndex.get(key)! + 1) : 0
		const topY = isCreated ? eventY + h / 2 : y + h
		const botY = isDestroyed
			? lifelineTop + eventStep * (destructionEventIndex.get(key)! + 1)
			: bottomY

		const lifelineHeight = botY - topY
		if (lifelineHeight > 0) {
			lines.push({ id: `lifeline-${key}`, x: x + w / 2, y: topY, endY: lifelineHeight })
		}
	}

	// 2. Activation boxes (just after lifelines)
	const activationPad = eventStep * ACTIVATION_PAD_RATIO
	const sortedSpans = activationSpans
		.map((span, origIdx) => ({ ...span, origIdx }))
		.sort((a, b) => {
			const sizeA = a.endEventIndex - a.startEventIndex
			const sizeB = b.endEventIndex - b.startEventIndex
			return sizeB - sizeA || a.origIdx - b.origIdx
		})

	for (let i = 0; i < sortedSpans.length; i++) {
		const span = sortedSpans[i]
		const actorIdx = keyIndex.get(span.participantKey)
		if (actorIdx === undefined) continue

		const spanSize = span.endEventIndex - span.startEventIndex
		let depth = 0
		for (const other of sortedSpans) {
			if (other === span) continue
			const sameParticipant = other.participantKey === span.participantKey
			const containsSpan =
				other.startEventIndex <= span.startEventIndex && other.endEventIndex >= span.endEventIndex
			const strictlyLarger = other.endEventIndex - other.startEventIndex > spanSize
			if (sameParticipant && containsSpan && strictlyLarger) depth++
		}

		const layout = layouts[actorIdx]
		const lifelineCenterX = layout.x + layout.w / 2
		const boxTop = lifelineTop + eventStep * (span.startEventIndex + 1) - activationPad
		const boxBottom = lifelineTop + eventStep * (span.endEventIndex + 1) + activationPad

		const id = `activation-${span.origIdx}`
		const kind = 'sequence_activation'
		nodes.push({
			id,
			kind,
			x: lifelineCenterX - ACTIVATION_BOX_WIDTH / 2 + depth * ACTIVATION_NEST_OFFSET,
			y: boxTop,
			w: ACTIVATION_BOX_WIDTH,
			h: boxBottom - boxTop,
			render: resolveMermaidNodeRender('sequence', id, kind, mapNode),
			fill: 'solid',
			color: 'light-violet',
			size: 's',
		})
	}

	// 3. Fragments
	for (let fragmentIndex = 0; fragmentIndex < fragments.length; fragmentIndex++) {
		const fragment = fragments[fragmentIndex]
		if (fragment.lastEventIndex < fragment.firstEventIndex) continue

		const fragTop = lifelineTop + eventStep * (fragment.firstEventIndex + 1) - FRAGMENT_PADDING_TOP
		const fragBottom =
			lifelineTop + eventStep * (fragment.lastEventIndex + 1) + FRAGMENT_PADDING_BOTTOM
		const indices = [...fragment.actorKeys].map((k) => keyIndex.get(k)!).filter((idx) => idx >= 0)
		if (indices.length === 0) continue

		const minIndex = Math.min(...indices)
		const maxIndex = Math.max(...indices)
		const leftX = layouts[minIndex].x - FRAGMENT_PADDING_X
		const fragW = layouts[maxIndex].x + layouts[maxIndex].w + FRAGMENT_PADDING_X - leftX
		const fragH = fragBottom - fragTop

		const rgbColor =
			fragment.keyword === 'rect' ? parseRgbToTldrawColor(fragment.sections[0].title) : null
		const fragId = `fragment-${fragmentIndex}`
		const fragKind = 'sequence_fragment'
		if (rgbColor) {
			nodes.push({
				id: fragId,
				kind: fragKind,
				x: leftX,
				y: fragTop,
				w: fragW,
				h: fragH,
				render: resolveMermaidNodeRender('sequence', fragId, fragKind, mapNode),
				fill: rgbColor.hasAlpha ? 'semi' : 'solid',
				color: rgbColor.color,
				size: 's',
			})
		} else {
			nodes.push({
				id: fragId,
				kind: fragKind,
				x: leftX,
				y: fragTop,
				w: fragW,
				h: fragH,
				render: resolveMermaidNodeRender('sequence', fragId, fragKind, mapNode),
				dash: 'dashed',
				fill: 'none',
				color: 'light-blue',
				size: 's',
				align: 'start',
				verticalAlign: 'start',
				label: `${fragment.keyword} [${fragment.sections[0].title}]`,
			})

			for (let s = 1; s < fragment.sections.length; s++) {
				const section = fragment.sections[s]
				const sepY = lifelineTop + eventStep * (section.firstEventIndex + 0.5)

				lines.push({
					id: `fragment-${fragmentIndex}-sep-${s}`,
					x: leftX,
					y: sepY,
					endX: fragW,
					endY: 0,
					dash: 'dashed',
					color: 'light-blue',
					size: 's',
				})

				const secId = `fragment-${fragmentIndex}-section-${s}`
				const secKind = 'sequence_fragment_section'
				nodes.push({
					id: secId,
					kind: secKind,
					x: leftX + FRAGMENT_SECTION_LABEL_PADDING,
					y: sepY + FRAGMENT_SECTION_LABEL_PADDING,
					w: fragW - FRAGMENT_SECTION_LABEL_PADDING * 2,
					h: FRAGMENT_SECTION_LABEL_HEIGHT,
					render: resolveMermaidNodeRender('sequence', secId, secKind, mapNode),
					fill: 'none',
					dash: 'dashed',
					color: 'light-blue',
					size: 's',
					align: 'start',
					verticalAlign: 'start',
					label: `[${section.title}]`,
				})
			}
		}
	}

	// 4. Actor boxes (top and bottom)
	for (let i = 0; i < actorCount; i++) {
		const key = actorKeys[i]
		const actor = actors.get(key)
		if (!actor) continue
		const { x, y, w, h, bottomY } = layouts[i]
		const isCreated = creationEventIndex.has(key)
		const isDestroyed = destructionEventIndex.has(key)
		const kind = actor.type
		const label = actor.description || actor.name || key
		const shared = {
			kind,
			label,
			align: 'middle' as const,
			verticalAlign: 'middle' as const,
			size: 's' as const,
		}

		const creationY = isCreated ? lifelineTop + eventStep * (creationEventIndex.get(key)! + 1) : 0
		const topY = isCreated ? creationY - h / 2 : y
		const topId = `actor-top-${key}`
		nodes.push({
			id: topId,
			x,
			y: topY,
			w,
			h,
			...shared,
			render: resolveMermaidNodeRender('sequence', topId, kind, mapNode),
		})

		if (!isDestroyed) {
			const botId = `actor-bottom-${key}`
			nodes.push({
				id: botId,
				x,
				y: bottomY,
				w,
				h,
				...shared,
				render: resolveMermaidNodeRender('sequence', botId, kind, mapNode),
			})
		}
	}

	// 5. Events: signals and notes
	const pendingCreations = new Set(createdActors.keys())
	let sequenceNumber = autonumberStart

	for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
		const msg = events[eventIndex]
		const anchor = (eventIndex + 1) / (events.length + 1)

		if (isSignalMessage(msg.type)) {
			const fromKey = msg.from!
			const toKey = msg.to!
			if (!keyIndex.has(fromKey) || !keyIndex.has(toKey)) continue

			const isCreationMessage = pendingCreations.has(toKey)
			if (isCreationMessage) pendingCreations.delete(toKey)

			const msgType = msg.type ?? LINETYPE.SOLID
			const { dash, arrowheadEnd } = mapLineTypeToArrowProps(msgType)
			const isSelf = fromKey === toKey
			const bidir = !isSelf && isBidirectional(msgType)

			const edge: MermaidBlueprintEdge = {
				startNodeId: `lifeline-${fromKey}`,
				endNodeId: isCreationMessage ? `actor-top-${toKey}` : `lifeline-${toKey}`,
				label: getMessageLabel(msg),
				bend: isSelf ? SELF_MSG_BEND : 0,
				dash,
				arrowheadEnd,
				arrowheadStart: bidir ? 'arrow' : 'none',
				size: 's',
				anchorStartY: isSelf ? anchor - SELF_MSG_Y_OFFSET : anchor,
				anchorEndY: isCreationMessage ? 0.5 : isSelf ? anchor + SELF_MSG_Y_OFFSET : anchor,
				isExact: true,
				isPrecise: true,
				...(isCreationMessage && { isExactEnd: false, isPreciseEnd: false }),
			}

			if (autonumberVisible) {
				edge.decoration = { type: 'autonumber', value: String(sequenceNumber) }
				sequenceNumber += autonumberStep
			}

			edges.push(edge)
		} else if (isNoteMessage(msg.type)) {
			const eventY = lifelineTop + eventStep * (eventIndex + 1)
			const fromKey = msg.from!
			const fromIdx = keyIndex.get(fromKey)
			const toIdx = keyIndex.get(msg.to ?? fromKey)
			if (fromIdx === undefined) continue

			const label = getMessageLabel(msg)
			// Mermaid types `placement` as a string enum but the runtime value is numeric
			const msgPlacement = msg.placement as unknown as number | undefined
			const fromCenterX = layouts[fromIdx].x + layouts[fromIdx].w / 2
			const toCenterX = toIdx !== undefined ? layouts[toIdx].x + layouts[toIdx].w / 2 : fromCenterX
			const isSpanning =
				msgPlacement === PLACEMENT.OVER && msg.from !== msg.to && toIdx !== undefined

			const svgNote = svgNoteRects[svgNoteIndex++]
			const noteHeight = svgNote?.h ?? FALLBACK_NOTE_HEIGHT
			const textWidth = label ? label.length * NOTE_CHAR_WIDTH + NOTE_TEXT_PADDING : 0
			const baseWidth = Math.max(svgNote?.w ?? FALLBACK_NOTE_WIDTH, textWidth)
			const noteWidth = isSpanning
				? Math.max(baseWidth, Math.abs(toCenterX - fromCenterX) + NOTE_PADDING)
				: baseWidth

			let noteX: number
			if (msgPlacement === PLACEMENT.LEFTOF) {
				noteX = fromCenterX - noteWidth - NOTE_PADDING
			} else if (msgPlacement === PLACEMENT.RIGHTOF) {
				noteX = fromCenterX + NOTE_PADDING
			} else if (isSpanning) {
				noteX = (fromCenterX + toCenterX) / 2 - noteWidth / 2
			} else {
				noteX = fromCenterX - noteWidth / 2
			}

			const noteId = `note-${eventIndex}`
			const noteKind = 'sequence_note'
			nodes.push({
				id: noteId,
				kind: noteKind,
				x: noteX,
				y: eventY - noteHeight / 2,
				w: noteWidth,
				h: noteHeight,
				render: resolveMermaidNodeRender('sequence', noteId, noteKind, mapNode),
				fill: 'solid',
				color: 'yellow',
				dash: 'draw',
				size: 's',
				align: 'middle',
				verticalAlign: 'middle',
				label,
			})
		}
	}

	return {
		diagramKind: 'sequence',
		nodes,
		edges,
		lines,
		groups: actorKeys.map((key) => {
			const group = [`actor-top-${key}`, `lifeline-${key}`]
			if (!destructionEventIndex.has(key)) {
				group.push(`actor-bottom-${key}`)
			}
			return group
		}),
	}
}
