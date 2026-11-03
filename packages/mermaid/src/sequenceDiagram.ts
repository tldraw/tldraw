import { invLerp } from '@tldraw/utils'
import type { SequenceModel } from 'pele'
import { clamp, TLArrowShapeArrowheadStyle, TLDefaultDashStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
	MermaidBlueprintLineNode,
} from './blueprint'
import { parseRgbToTldrawColor } from './colors'
import type { MeasureLabelWidth } from './mermaidNodeCreateShape'
import { getOrigin, parsePathPoints } from './peleDiagram'
import type { Vec2 } from './svgParsing'

type SeqActor = SequenceModel['actors'] extends Map<string, infer A> ? A : never
type SeqBox = NonNullable<SeqActor['box']>
type SeqMessage = SequenceModel['messages'][number]

/** The parts of pele's actor that the blueprint reads. */
export type SequenceActor = Pick<SeqActor, 'name' | 'description' | 'type'> & {
	box?: Pick<SeqBox, 'name' | 'fill'>
}

/** The parts of pele's message that the blueprint reads. */
export type SequenceMessage = Pick<SeqMessage, 'message'> &
	Partial<Pick<SeqMessage, 'from' | 'to' | 'type' | 'placement'>>

export interface SvgRect {
	x: number
	y: number
	w: number
	h: number
}

export interface ActorLayout extends SvgRect {
	bottomY: number
}

export interface FragmentFrameLayout {
	top: number
	bottom: number
	sectionYs: number[]
}

export interface ParsedSequenceLayout {
	actorLayouts: ActorLayout[]
	noteRects: SvgRect[]
	/**
	 * The layout gives each row as much room as its content needs, so rows are read from its rendering
	 * rather than spaced evenly. Keyed by index into the diagram's messages, in the same space as
	 * `actorLayouts`.
	 */
	rowYs: Map<number, number>
	/** Keyed by the index of the message that closes the fragment. */
	fragmentFrames: Map<number, FragmentFrameLayout>
}

export const LINETYPE = {
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
	SOLID_TOP: 41,
	SOLID_BOTTOM: 42,
	STICK_TOP: 43,
	STICK_BOTTOM: 44,
	SOLID_ARROW_TOP_REVERSE: 45,
	SOLID_ARROW_BOTTOM_REVERSE: 46,
	STICK_ARROW_TOP_REVERSE: 47,
	STICK_ARROW_BOTTOM_REVERSE: 48,
	SOLID_TOP_DOTTED: 51,
	SOLID_BOTTOM_DOTTED: 52,
	STICK_TOP_DOTTED: 53,
	STICK_BOTTOM_DOTTED: 54,
	SOLID_ARROW_TOP_REVERSE_DOTTED: 55,
	SOLID_ARROW_BOTTOM_REVERSE_DOTTED: 56,
	STICK_ARROW_TOP_REVERSE_DOTTED: 57,
	STICK_ARROW_BOTTOM_REVERSE_DOTTED: 58,
	CENTRAL_CONNECTION: 59,
	CENTRAL_CONNECTION_REVERSE: 60,
	CENTRAL_CONNECTION_DUAL: 61,
} as const

export const PLACEMENT = {
	LEFTOF: 0,
	RIGHTOF: 1,
	OVER: 2,
} as const

const SIGNAL_TYPES = new Set<number>([
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
])

const DOTTED_TYPES = new Set<number>([
	LINETYPE.DOTTED,
	LINETYPE.DOTTED_CROSS,
	LINETYPE.DOTTED_OPEN,
	LINETYPE.DOTTED_POINT,
	LINETYPE.BIDIRECTIONAL_DOTTED,
])

const ARROWHEAD_BY_TYPE = new Map<number, TLArrowShapeArrowheadStyle>([
	[LINETYPE.SOLID_CROSS, 'bar'],
	[LINETYPE.DOTTED_CROSS, 'bar'],
	[LINETYPE.SOLID_OPEN, 'none'],
	[LINETYPE.DOTTED_OPEN, 'none'],
])

const FRAGMENT_START_KEYWORDS = new Map<number, string>([
	[LINETYPE.LOOP_START, 'loop'],
	[LINETYPE.ALT_START, 'alt'],
	[LINETYPE.OPT_START, 'opt'],
	[LINETYPE.PAR_START, 'par'],
	[LINETYPE.RECT_START, 'rect'],
	[LINETYPE.CRITICAL_START, 'critical'],
	[LINETYPE.BREAK_START, 'break'],
	[LINETYPE.PAR_OVER_START, 'par'],
])

const FRAGMENT_END_TYPES = new Set<number>([
	LINETYPE.LOOP_END,
	LINETYPE.ALT_END,
	LINETYPE.OPT_END,
	LINETYPE.PAR_END,
	LINETYPE.RECT_END,
	LINETYPE.CRITICAL_END,
	LINETYPE.BREAK_END,
])

const FRAGMENT_SEPARATOR_KEYWORDS = new Map<number, string>([
	[LINETYPE.ALT_ELSE, 'else'],
	[LINETYPE.PAR_AND, 'and'],
	[LINETYPE.CRITICAL_OPTION, 'option'],
])

function isSignalMessage(type: number | undefined): boolean {
	return type !== undefined && SIGNAL_TYPES.has(type)
}

/** Signals and notes are the only messages that occupy a row on the lifelines. */
function isRenderableEvent(msg: SequenceMessage): boolean {
	return Boolean(
		(isSignalMessage(msg.type) && msg.from && msg.to) || (msg.type === LINETYPE.NOTE && msg.from)
	)
}

/** Map a Mermaid LINETYPE value to tldraw arrow props. */
function mapLineTypeToArrowProps(type: number): {
	dash: TLDefaultDashStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
} {
	return {
		dash: DOTTED_TYPES.has(type) ? 'dotted' : 'solid',
		arrowheadEnd: ARROWHEAD_BY_TYPE.get(type) ?? 'arrow',
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
const FRAGMENT_PADDING_X = 30
const FRAGMENT_PADDING_TOP = 50
const FRAGMENT_PADDING_BOTTOM = 25
const ACTOR_PADDING_WIDTH = 30
const ACTOR_PADDING_HEIGHT = 10
const SELF_MSG_Y_OFFSET = 0.04
const SELF_MSG_BEND = -80
// How far up into the label drawn above a message's line our arrow sits. Our labels are
// centred on the arrow and taller than the layout's, so halfway pushed them into a fragment's section
// title above, while the line itself pushed them across the frame's bottom edge.
const MESSAGE_ROW_LABEL_SHARE = 0.25
const MIN_LIFELINE_HEIGHT = 1
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
	endMessageIndex: number
}

interface ActivationSpan {
	participantKey: string
	startEventIndex: number
	endEventIndex: number
}

interface ComputedActorLayouts {
	actorLayouts: ActorLayout[]
	/** Maps a y in the rendered SVG into the space of `actorLayouts`, when they were read from it. */
	toLayoutY?(svgY: number): number
}

/**
 * Space the actors read from the SVG out to {@link TARGET_ACTOR_SPACING} and stretch short diagrams
 * to {@link MIN_VERTICAL_GAP}. `top` and `bottom` hold each actor's header and footer box, in actor
 * order.
 */
function layoutActorsFromSvg(top: SvgRect[], bottom: SvgRect[]): Required<ComputedActorLayouts> {
	const svgCenters = top.map((r) => r.x + r.w / 2)
	const spacings: number[] = []
	for (let i = 1; i < svgCenters.length; i++) {
		spacings.push(svgCenters[i] - svgCenters[i - 1])
	}
	const minSpacing = spacings.length > 0 ? Math.min(...spacings) : 1
	const scale = Math.max(1, TARGET_ACTOR_SPACING / minSpacing)

	const xCenters = svgCenters.map((c) => (c - svgCenters[0]) * scale)
	const totalSpan = xCenters.length > 1 ? xCenters[xCenters.length - 1] : 0

	// A created participant's top box and a destroyed one's bottom box sit mid-diagram, so
	// neither marks a row edge. Measuring the gap from one reports the diagram as far shorter
	// than it is, inflating the stretch below and leaving the whole diagram too tall.
	const headerBottom = Math.min(...top.map((r) => r.y + r.h))
	const footerTop = Math.max(...bottom.map((r) => r.y))
	const yStretch = Math.max(0, MIN_VERTICAL_GAP - (footerTop - headerBottom))
	const topMinY = Math.min(...top.map((r) => r.y))
	const bottomMaxY = Math.max(...bottom.map((r) => r.y + r.h))
	const originY = -(bottomMaxY + yStretch + topMinY) / 2
	// The stretch pushes the footer down, so spread it over the rows between header and footer.
	const toLayoutY = (svgY: number) =>
		originY +
		svgY +
		(footerTop > headerBottom ? yStretch * clamp(invLerp(headerBottom, footerTop, svgY), 0, 1) : 0)

	const actorLayouts = top.map((topRect, i) => {
		const w = topRect.w + ACTOR_PADDING_WIDTH
		const h = topRect.h + ACTOR_PADDING_HEIGHT
		return {
			x: xCenters[i] - totalSpan / 2 - w / 2,
			// Through `toLayoutY` so a created or destroyed participant's mid-diagram box takes
			// the same share of the stretch as the row it sits on, rather than all of it or none.
			y: toLayoutY(topRect.y),
			w,
			h,
			bottomY: toLayoutY(bottom[i].y),
		}
	})
	return { actorLayouts, toLayoutY }
}

function getFallbackActorLayouts(actorCount: number, eventCount: number): ComputedActorLayouts {
	const fallbackLifelineHeight = Math.max(300, eventCount * FALLBACK_EVENT_SPACING)
	const totalWidth = actorCount * FALLBACK_ACTOR_WIDTH + (actorCount - 1) * FALLBACK_ACTOR_SPACING
	const totalHeight = FALLBACK_ACTOR_HEIGHT * 2 + fallbackLifelineHeight
	const startX = -totalWidth / 2
	const startY = -totalHeight / 2
	return {
		actorLayouts: Array.from({ length: actorCount }, (_, i) => ({
			x: startX + i * (FALLBACK_ACTOR_WIDTH + FALLBACK_ACTOR_SPACING),
			y: startY,
			w: FALLBACK_ACTOR_WIDTH,
			h: FALLBACK_ACTOR_HEIGHT,
			bottomY: startY + totalHeight - FALLBACK_ACTOR_HEIGHT,
		})),
	}
}

/** Pele tags each message and note it draws with `i<index into the model's messages>`. */
function getMessageIndex(el: Element): number | undefined {
	const match = el.getAttribute('data-id')?.match(/^i(\d+)$/)
	return match ? Number(match[1]) : undefined
}

function getActorLabel(actors: Map<string, SequenceActor>, key: string): string {
	const actor = actors.get(key)
	return actor?.description || actor?.name || key
}

/**
 * Widen each actor box to fit its label, moving the actors to its right along by as much: widening in
 * place would eat the gap the layout left between neighbors, and long names would overlap.
 */
function fitActorsToLabels(
	layouts: ActorLayout[],
	labels: string[],
	measureLabelWidth: MeasureLabelWidth
): ActorLayout[] {
	let shift = 0
	let previousGrowth = 0
	return layouts.map((layout, i) => {
		const w = Math.max(layout.w, measureLabelWidth(labels[i], 's'))
		const growth = w - layout.w
		shift += (previousGrowth + growth) / 2
		previousGrowth = growth
		return { ...layout, x: layout.x + shift - growth / 2, w }
	})
}

function getMessageLabel(msg: SequenceMessage): string | undefined {
	return typeof msg.message === 'string' ? msg.message : undefined
}

/** Count how many renderable events (signals + notes) a message list contains. */
export function countSequenceEvents(messages: SequenceMessage[]): number {
	return messages.filter(isRenderableEvent).length
}

/**
 * Read actor, row, note and fragment positions from pele's sequence SVG. Messages and notes carry
 * `i<index into messages>` in `data-id` and actors their key, but fragment frames carry
 * no id, so those are matched to the messages that close them by order.
 */
export function parseSequenceLayout(root: Element, model: SequenceModel): ParsedSequenceLayout {
	const actorKeys = [...model.actors.keys()]
	const actorBoxes = parsePeleActorBoxes(root, actorKeys)
	if (!actorBoxes) {
		const { actorLayouts } = getFallbackActorLayouts(
			actorKeys.length,
			countSequenceEvents(model.messages)
		)
		return { actorLayouts, noteRects: [], rowYs: new Map(), fragmentFrames: new Map() }
	}
	const { actorLayouts, toLayoutY } = layoutActorsFromSvg(actorBoxes.top, actorBoxes.bottom)

	const rowYs = new Map<number, number>()
	const labelTops = new Map<number, number>()
	for (const el of root.querySelectorAll('.pele-edge-label[data-id]')) {
		const index = getMessageIndex(el)
		const baselines = [...el.querySelectorAll('text, tspan')]
			.map((text) => parseFloat(text.getAttribute('y') ?? ''))
			.filter(Number.isFinite)
		if (index === undefined || !baselines.length) continue
		// Pele's text `y` is a baseline, so the label's top sits about a font size above it.
		const fontSize = parseFloat(el.closest('[font-size]')?.getAttribute('font-size') ?? '') || 0
		labelTops.set(index, getOrigin(el).y + Math.min(...baselines) - fontSize)
	}
	for (const el of root.querySelectorAll('.pele-message[data-id]')) {
		const index = getMessageIndex(el)
		const path = el.querySelector('path:not(.pele-marker)')
		if (index === undefined || !path) continue
		const ys = parsePathPoints(path.getAttribute('d') ?? '').map((point) => point.y)
		if (!ys.length) continue
		const originY = getOrigin(el).y
		let y: number
		if (Math.max(...ys) > ys[0]) {
			// Our self-message loop is far taller than pele's and holds its own label, so it centres
			// on pele's loop.
			y = originY + (Math.min(...ys) + Math.max(...ys)) / 2
		} else {
			const lineY = originY + ys[0]
			const labelTopY = Math.min(lineY, labelTops.get(index) ?? lineY)
			y = lineY - (lineY - labelTopY) * MESSAGE_ROW_LABEL_SHARE
		}
		rowYs.set(index, toLayoutY(y))
	}

	const notes: { index: number; rect: SvgRect }[] = []
	for (const el of root.querySelectorAll('.pele-note[data-id]')) {
		const index = getMessageIndex(el)
		const rect = el.querySelector('rect')
		if (index === undefined || !rect) continue
		const noteRect = getRect(rect)
		notes.push({ index, rect: noteRect })
		rowYs.set(index, toLayoutY(noteRect.y + noteRect.h / 2))
	}
	notes.sort((a, b) => a.index - b.index)

	return {
		actorLayouts,
		noteRects: notes.map((note) => note.rect),
		rowYs,
		fragmentFrames: parsePeleFragmentFrames(root, model.messages, toLayoutY),
	}
}

/**
 * Each actor's header and footer box. A participant's box is its rect; the other kinds draw a figure
 * whose label hangs below it, so they get a participant-sized box ending where the lifeline meets
 * it. A destroyed actor, or every actor once
 * `mirrorActors` is off, has no footer, so its lifeline's end stands in for one.
 */
function parsePeleActorBoxes(
	root: Element,
	actorKeys: string[]
): { top: SvgRect[]; bottom: SvgRect[] } | undefined {
	const lifelines = new Map<string, Vec2[]>()
	for (const el of root.querySelectorAll('.pele-lifeline[data-id]')) {
		const origin = getOrigin(el)
		const points = parsePathPoints(el.getAttribute('d') ?? '').map((point) => ({
			x: origin.x + point.x,
			y: origin.y + point.y,
		}))
		if (points.length) lifelines.set(el.getAttribute('data-id')!, points)
	}
	const headerRects = new Map<string, SvgRect>()
	const footerRects = new Map<string, SvgRect>()
	for (const el of root.querySelectorAll('.pele-actor[data-id]')) {
		const rect = [...el.children].find((child) => child.tagName.toLowerCase() === 'rect')
		if (!rect) continue
		const rects = el.classList.contains('pele-actor-footer') ? footerRects : headerRects
		rects.set(el.getAttribute('data-id')!, getRect(rect))
	}
	const footerKeys = new Set(
		[...root.querySelectorAll('.pele-actor-footer[data-id]')].map((el) =>
			el.getAttribute('data-id')
		)
	)

	const participantRects = [...headerRects.values()]
	const refW = participantRects.length
		? Math.max(...participantRects.map((r) => r.w))
		: FALLBACK_ACTOR_WIDTH
	const refH = participantRects.length
		? Math.max(...participantRects.map((r) => r.h))
		: FALLBACK_ACTOR_HEIGHT

	const top: SvgRect[] = []
	const bottom: SvgRect[] = []
	for (const key of actorKeys) {
		const lifeline = lifelines.get(key)
		if (!lifeline) return undefined
		const x = lifeline[0].x
		const lifelineTop = Math.min(...lifeline.map((point) => point.y))
		const lifelineEnd = Math.max(...lifeline.map((point) => point.y))
		top.push(headerRects.get(key) ?? { x: x - refW / 2, y: lifelineTop - refH, w: refW, h: refH })
		bottom.push(
			footerRects.get(key) ?? {
				x: x - refW / 2,
				y: lifelineEnd,
				w: refW,
				h: footerKeys.has(key) ? refH : 0,
			}
		)
	}
	return { top, bottom }
}

/**
 * Pele draws `rect` fragments as plain rects in the order they open, and every other fragment as a
 * frame in the order it closes, so inner frames come before the frame around them. Each kind is
 * matched separately, and a kind whose count disagrees with the model is skipped rather than
 * risk a frame landing on the wrong fragment.
 */
function parsePeleFragmentFrames(
	root: Element,
	messages: SequenceMessage[],
	toLayoutY: (svgY: number) => number
): Map<number, FragmentFrameLayout> {
	const closedByKeyword = new Map<string, { startIndex: number; endIndex: number }[]>()
	const open: { keyword: string; startIndex: number }[] = []
	for (let i = 0; i < messages.length; i++) {
		const type = messages[i].type ?? -1
		const keyword = FRAGMENT_START_KEYWORDS.get(type)
		if (keyword) open.push({ keyword, startIndex: i })
		else if (FRAGMENT_END_TYPES.has(type)) {
			const fragment = open.pop()
			if (!fragment) continue
			const closed = closedByKeyword.get(fragment.keyword) ?? []
			closed.push({ startIndex: fragment.startIndex, endIndex: i })
			closedByKeyword.set(fragment.keyword, closed)
		}
	}

	const frames = new Map<number, FragmentFrameLayout>()
	for (const [keyword, closed] of closedByKeyword) {
		const isRect = keyword === 'rect'
		const elements = [
			...root.querySelectorAll(isRect ? 'rect.pele-rect' : `.pele-frame.pele-frame-${keyword}`),
		]
		if (elements.length !== closed.length) continue
		if (isRect) closed.sort((a, b) => a.startIndex - b.startIndex)
		for (let i = 0; i < closed.length; i++) {
			const el = elements[i]
			const outline = isRect ? el : el.querySelector('rect')
			if (!outline) continue
			const { y, h } = getRect(outline)
			const originY = getOrigin(el).y
			const sectionYs = isRect
				? []
				: [...el.querySelectorAll('path[stroke-dasharray]')].flatMap((path) => {
						const start = parsePathPoints(path.getAttribute('d') ?? '')[0]
						return start ? [originY + start.y] : []
					})
			frames.set(closed[i].endIndex, {
				top: toLayoutY(y),
				bottom: toLayoutY(y + h),
				sectionYs: sectionYs.sort((a, b) => a - b).map(toLayoutY),
			})
		}
	}
	return frames
}

function getRect(rect: Element): SvgRect {
	const origin = getOrigin(rect)
	return {
		x: origin.x + parseFloat(rect.getAttribute('x') || '0'),
		y: origin.y + parseFloat(rect.getAttribute('y') || '0'),
		w: parseFloat(rect.getAttribute('width') || '0'),
		h: parseFloat(rect.getAttribute('height') || '0'),
	}
}

/**
 * Build a complete blueprint for a sequence diagram:
 * top actors, lifelines, bottom actors, fragments, notes, and signal edges.
 */
export function sequenceToBlueprint(
	layout: ParsedSequenceLayout,
	actors: Map<string, SequenceActor>,
	actorKeys: string[],
	messages: SequenceMessage[],
	createdActors: Map<string, number> = new Map(),
	destroyedActors: Map<string, number> = new Map(),
	measureLabelWidth: MeasureLabelWidth = () => 0
): DiagramMermaidBlueprint {
	const actorCount = actorKeys.length
	if (actorCount === 0)
		return { diagramKind: 'sequence', nodes: [], edges: [], lines: [], groups: [] }
	const keyIndex = new Map(actorKeys.map((key, i) => [key, i]))

	const fragments: FragmentSpan[] = []
	const fragmentStack: OpenFragment[] = []
	const events: SequenceMessage[] = []
	const eventMessageIndices: number[] = []
	const activationStack = new Map<string, number[]>()
	const activationSpans: ActivationSpan[] = []

	// Autonumbering is positional: an `autonumber` directive applies from where it
	// appears onward, so a later `autonumber off` must not clear numbers already
	// assigned above it. Resolve each event's label as we walk the messages.
	const eventAutonumbers: (string | undefined)[] = []
	let autonumber = 1
	let autonumberStep = 1
	let autonumberVisible = false

	// `createdActors`/`destroyedActors` index into `messages`, which counts fragment and
	// activation statements, so a lifecycle row can only be recognised during this walk.
	const creationEventIndex = new Map<string, number>()
	const destructionEventIndex = new Map<string, number>()

	for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
		const msg = messages[messageIndex]
		const type = msg.type ?? -1
		if (type === LINETYPE.AUTONUMBER) {
			// `autonumber [start [step]]` / `autonumber off`; mermaid stores the options on
			// `message`. Omitting `start` resumes the running counter rather than resetting
			// to 1, so a bare `autonumber` part-way down a diagram continues the sequence
			// from the signals above it. Matches mermaid.
			if (typeof msg.message === 'object') {
				autonumber = msg.message.start || autonumber
				autonumberStep = msg.message.step || autonumberStep
				autonumberVisible = msg.message.visible
			} else {
				autonumberVisible = true
			}
			continue
		}

		const keyword = FRAGMENT_START_KEYWORDS.get(type)
		if (keyword) {
			fragmentStack.push({
				keyword,
				sections: [{ title: getMessageLabel(msg) ?? '', firstEventIndex: events.length }],
				firstEventIndex: events.length,
				actorKeys: new Set(),
			})
			continue
		}

		if (FRAGMENT_END_TYPES.has(type)) {
			const frag = fragmentStack.pop()
			if (frag)
				fragments.push({
					...frag,
					lastEventIndex: events.length - 1,
					endMessageIndex: messageIndex,
				})
			continue
		}

		if (FRAGMENT_SEPARATOR_KEYWORDS.has(type)) {
			const current = fragmentStack[fragmentStack.length - 1]
			if (current) {
				current.sections.push({
					title: getMessageLabel(msg) ?? '',
					firstEventIndex: events.length,
				})
			}
			continue
		}

		if (type === LINETYPE.ACTIVE_START) {
			const key = msg.from ?? msg.to
			if (key) {
				if (!activationStack.has(key)) activationStack.set(key, [])
				// Explicit `activate` follows the triggering arrow,
				// so the activation starts at the previous event.
				activationStack.get(key)!.push(Math.max(0, events.length - 1))
			}
			continue
		}

		if (type === LINETYPE.ACTIVE_END) {
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

		if (!isRenderableEvent(msg)) continue

		for (const frag of fragmentStack) {
			if (msg.from) frag.actorKeys.add(msg.from)
			if (msg.to) frag.actorKeys.add(msg.to)
		}
		const isSignal = isSignalMessage(msg.type)
		if (isSignal) {
			// Mermaid's own `adjustCreatedDestroyedData`: one exclusive chain, reached from its
			// signal branch alone. So a `destroy` recorded against a note is one mermaid ignores,
			// and a message that both creates its target and destroys its sender opens a box
			// rather than closing one. Going by the recorded statement rather than the first
			// event the actor sends is what stops `Client->>Temp` from cutting Temp's lifeline
			// at an earlier row where Temp happened to reply.
			const from = msg.from!
			const to = msg.to!
			if (createdActors.get(to) === messageIndex) creationEventIndex.set(to, events.length)
			else if (destroyedActors.get(from) === messageIndex)
				destructionEventIndex.set(from, events.length)
			else if (destroyedActors.get(to) === messageIndex)
				destructionEventIndex.set(to, events.length)
		}
		events.push(msg)
		eventMessageIndices.push(messageIndex)

		// Only signals consume a number; notes occupy a row but are never numbered.
		// The counter advances even while numbering is off, matching mermaid.
		eventAutonumbers.push(isSignal && autonumberVisible ? String(autonumber) : undefined)
		if (isSignal) autonumber = Math.round((autonumber + autonumberStep) * 100) / 100
	}

	const layouts = fitActorsToLabels(
		layout.actorLayouts,
		actorKeys.map((key) => getActorLabel(actors, key)),
		measureLabelWidth
	)

	// Build blueprint
	const svgNoteRects = layout.noteRects
	let svgNoteIndex = 0
	const nodes: MermaidBlueprintNode[] = []
	const lines: MermaidBlueprintLineNode[] = []
	const edges: MermaidBlueprintEdge[] = []

	const lifelineTop = layouts[0].y + layouts[0].h
	// Surviving actors all share the footer row, but a destroyed actor's bottom box sits
	// mid-diagram, so it must not be the baseline the whole row grid is priced against.
	const diagramBottomY = Math.max(...layouts.map((l) => l.bottomY))
	const eventStep = (diagramBottomY - lifelineTop) / (events.length + 1)
	const measuredRowYs = eventMessageIndices.map((messageIndex) => layout.rowYs.get(messageIndex))
	// Mixing measured rows with evenly spaced ones could put a row above the one before it, so a
	// single row the layout didn't draw sends every row back to the even grid.
	const hasMeasuredRows = measuredRowYs.every((y) => y !== undefined)
	// Row -1 is the top of the lifelines and row `events.length` the bottom, so a fragment section
	// that opens before the first row or after the last still has a neighbour to sit between.
	const eventY = (eventIndex: number) => {
		if (eventIndex < 0) return lifelineTop
		if (eventIndex >= events.length) return diagramBottomY
		return hasMeasuredRows ? measuredRowYs[eventIndex]! : lifelineTop + eventStep * (eventIndex + 1)
	}

	// Where each actor's two boxes sit, and the lifeline strung between their inner edges.
	// A created or destroyed participant puts its box on the message row that opens or closes
	// it rather than at the edge of the diagram, so all three move together.
	const lifecycles = layouts.map(({ y, h, bottomY }, i) => {
		const createdAt = creationEventIndex.get(actorKeys[i])
		const destroyedAt = destructionEventIndex.get(actorKeys[i])
		const topBoxY = createdAt !== undefined ? eventY(createdAt) - h / 2 : y
		const lifelineTopY = topBoxY + h
		// Boxes a row apart can meet: evenly spaced rows leave them no room, and our boxes are taller
		// than the layout's. Push the bottom box down rather than let the lifeline vanish: with no
		// lifeline shape to bind to, every arrow that reaches this participant is dropped without a
		// trace.
		const bottomBoxY = Math.max(
			destroyedAt !== undefined ? eventY(destroyedAt) - h / 2 : bottomY,
			lifelineTopY + MIN_LIFELINE_HEIGHT
		)
		return { topBoxY, lifelineTopY, bottomBoxY }
	})

	// --- Z-order: participant boxes -> lifelines -> activations -> fragments -> actor boxes -> notes/arrows ---
	// Lines render beneath every node, so nodes that would cover them are marked `background`.

	// 0. Participant boxes (behind everything)
	nodes.push(
		...getParticipantBoxNodes(
			actors,
			actorKeys,
			layouts,
			Math.min(...layouts.map((l) => l.y)),
			Math.max(...lifecycles.map((l, i) => l.bottomBoxY + layouts[i].h))
		)
	)

	// 1. Lifelines
	for (let i = 0; i < actorCount; i++) {
		const { x, w } = layouts[i]
		const { lifelineTopY, bottomBoxY } = lifecycles[i]
		lines.push({
			id: `lifeline-${actorKeys[i]}`,
			x: x + w / 2,
			y: lifelineTopY,
			endY: bottomBoxY - lifelineTopY,
		})
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

		const actorLayout = layouts[actorIdx]
		const lifelineCenterX = actorLayout.x + actorLayout.w / 2
		const boxTop = eventY(span.startEventIndex) - activationPad
		const boxBottom = eventY(span.endEventIndex) + activationPad

		nodes.push({
			id: `activation-${span.origIdx}`,
			kind: 'sequence_activation',
			x: lifelineCenterX - ACTIVATION_BOX_WIDTH / 2 + depth * ACTIVATION_NEST_OFFSET,
			y: boxTop,
			w: ACTIVATION_BOX_WIDTH,
			h: boxBottom - boxTop,
			fill: 'solid',
			color: 'light-violet',
			size: 's',
		})
	}

	// 3. Fragments
	for (let fragmentIndex = 0; fragmentIndex < fragments.length; fragmentIndex++) {
		const fragment = fragments[fragmentIndex]
		if (fragment.lastEventIndex < fragment.firstEventIndex) continue

		// The layout's frame already leaves room for a title that wraps onto several lines.
		const frame = hasMeasuredRows ? layout.fragmentFrames.get(fragment.endMessageIndex) : undefined
		const fragTop = frame?.top ?? eventY(fragment.firstEventIndex) - FRAGMENT_PADDING_TOP
		const fragBottom = frame?.bottom ?? eventY(fragment.lastEventIndex) + FRAGMENT_PADDING_BOTTOM
		const sectionYs =
			frame?.sectionYs.length === fragment.sections.length - 1 ? frame.sectionYs : undefined
		const indices = [...fragment.actorKeys].map((k) => keyIndex.get(k)!).filter((idx) => idx >= 0)
		if (indices.length === 0) continue

		const minIndex = Math.min(...indices)
		const maxIndex = Math.max(...indices)
		const leftX = layouts[minIndex].x - FRAGMENT_PADDING_X
		const fragW = layouts[maxIndex].x + layouts[maxIndex].w + FRAGMENT_PADDING_X - leftX
		const fragH = fragBottom - fragTop

		const rgbColor =
			fragment.keyword === 'rect' ? parseRgbToTldrawColor(fragment.sections[0].title) : null
		const fragBox = {
			id: `fragment-${fragmentIndex}`,
			kind: 'sequence_fragment',
			x: leftX,
			y: fragTop,
			w: fragW,
			h: fragH,
		}
		if (rgbColor) {
			nodes.push({
				...fragBox,
				fill: rgbColor.hasAlpha ? 'semi' : 'solid',
				color: rgbColor.color,
				size: 's',
				background: true,
			})
		} else {
			nodes.push({
				...fragBox,
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
				const sepY =
					sectionYs?.[s - 1] ??
					(eventY(section.firstEventIndex - 1) + eventY(section.firstEventIndex)) / 2

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

				nodes.push({
					id: `fragment-${fragmentIndex}-section-${s}`,
					kind: 'sequence_fragment_section',
					x: leftX + FRAGMENT_SECTION_LABEL_PADDING,
					y: sepY + FRAGMENT_SECTION_LABEL_PADDING,
					w: fragW - FRAGMENT_SECTION_LABEL_PADDING * 2,
					h: FRAGMENT_SECTION_LABEL_HEIGHT,
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
		const { x, w, h } = layouts[i]
		const { topBoxY, bottomBoxY } = lifecycles[i]
		const shared = {
			kind: actor.type,
			label: getActorLabel(actors, key),
			x,
			w,
			h,
			align: 'middle' as const,
			verticalAlign: 'middle' as const,
			size: 's' as const,
		}

		nodes.push({ id: `actor-top-${key}`, y: topBoxY, ...shared })
		// A destroyed participant still gets a bottom box, on the destroying row instead of at the
		// foot of the diagram.
		nodes.push({ id: `actor-bottom-${key}`, y: bottomBoxY, ...shared })
	}

	// 5. Events: signals and notes

	// Created and destroyed participants have shorter lifelines than the rest, so the same row
	// is a different fraction along each one; one shared fraction would tilt their arrows.
	// A row can also fall past a truncated lifeline, which the layout draws into empty space.
	const anchorOnLifeline = (actorIndex: number, y: number) => {
		const { lifelineTopY, bottomBoxY } = lifecycles[actorIndex]
		return clamp(invLerp(lifelineTopY, bottomBoxY, y), 0, 1)
	}

	for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
		const msg = events[eventIndex]

		if (isSignalMessage(msg.type)) {
			const fromKey = msg.from!
			const toKey = msg.to!
			const fromIdx = keyIndex.get(fromKey)
			const toIdx = keyIndex.get(toKey)
			if (fromIdx === undefined || toIdx === undefined) continue

			const msgType = msg.type ?? LINETYPE.SOLID
			const { dash, arrowheadEnd } = mapLineTypeToArrowProps(msgType)
			const isSelf = fromKey === toKey
			const bidir = !isSelf && isBidirectional(msgType)

			// A lifeline stops half a box short of its lifecycle row, so a message on that row
			// terminates on the box that opens or closes there.
			const startBoxId =
				!isSelf && destructionEventIndex.get(fromKey) === eventIndex
					? `actor-bottom-${fromKey}`
					: undefined
			let endBoxId: string | undefined
			if (!isSelf) {
				if (creationEventIndex.get(toKey) === eventIndex) endBoxId = `actor-top-${toKey}`
				else if (destructionEventIndex.get(toKey) === eventIndex) endBoxId = `actor-bottom-${toKey}`
			}

			const rowY = eventY(eventIndex)
			const startAnchor = anchorOnLifeline(fromIdx, rowY)
			const endAnchor = anchorOnLifeline(toIdx, rowY)

			const edge: MermaidBlueprintEdge = {
				startNodeId: startBoxId ?? `lifeline-${fromKey}`,
				endNodeId: endBoxId ?? `lifeline-${toKey}`,
				label: getMessageLabel(msg),
				bend: isSelf ? SELF_MSG_BEND : 0,
				dash,
				arrowheadEnd,
				arrowheadStart: bidir ? 'arrow' : 'none',
				size: 's',
				anchorStartY: startBoxId
					? 0.5
					: isSelf
						? clamp(startAnchor - SELF_MSG_Y_OFFSET, 0, 1)
						: startAnchor,
				anchorEndY: endBoxId
					? 0.5
					: isSelf
						? clamp(endAnchor + SELF_MSG_Y_OFFSET, 0, 1)
						: endAnchor,
				isExact: !startBoxId,
				isPrecise: !startBoxId,
				isExactEnd: !endBoxId,
				isPreciseEnd: !endBoxId,
			}

			const autonumberLabel = eventAutonumbers[eventIndex]
			if (autonumberLabel) {
				edge.decoration = { type: 'autonumber', value: autonumberLabel }
			}

			edges.push(edge)
		} else if (msg.type === LINETYPE.NOTE) {
			const fromKey = msg.from!
			const fromIdx = keyIndex.get(fromKey)
			const toIdx = keyIndex.get(msg.to ?? fromKey)
			if (fromIdx === undefined) continue

			const label = getMessageLabel(msg)
			const msgPlacement = msg.placement
			const fromCenterX = layouts[fromIdx].x + layouts[fromIdx].w / 2
			const toCenterX = toIdx !== undefined ? layouts[toIdx].x + layouts[toIdx].w / 2 : fromCenterX
			const isSpanning =
				msgPlacement === PLACEMENT.OVER && msg.from !== msg.to && toIdx !== undefined

			const svgNote = svgNoteRects[svgNoteIndex++]
			const noteHeight = svgNote?.h ?? FALLBACK_NOTE_HEIGHT
			const baseWidth = Math.max(
				svgNote?.w ?? FALLBACK_NOTE_WIDTH,
				label ? measureLabelWidth(label, 's') : 0
			)
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

			nodes.push({
				id: `note-${eventIndex}`,
				kind: 'sequence_note',
				x: noteX,
				y: eventY(eventIndex) - noteHeight / 2,
				w: noteWidth,
				h: noteHeight,
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
		groups: actorKeys.map((key) => [`actor-top-${key}`, `lifeline-${key}`, `actor-bottom-${key}`]),
	}
}

const BOX_PADDING_X = 40
const BOX_PADDING_Y = 20
const BOX_LABEL_HEIGHT = 40

/**
 * Like mermaid, every box leaves room above the header row for a label once any box has one, so the
 * boxes stay level and no label sits on an actor.
 */
function getParticipantBoxNodes(
	actors: Map<string, SequenceActor>,
	actorKeys: string[],
	layouts: ActorLayout[],
	top: number,
	bottom: number
): MermaidBlueprintNode[] {
	const participantIndicesByBox = new Map<NonNullable<SequenceActor['box']>, number[]>()
	for (let i = 0; i < actorKeys.length; i++) {
		const box = actors.get(actorKeys[i])?.box
		if (!box) continue
		const indices = participantIndicesByBox.get(box)
		if (indices) indices.push(i)
		else participantIndicesByBox.set(box, [i])
	}

	const hasLabels = [...participantIndicesByBox.keys()].some((box) => box.name)
	const boxTop = top - BOX_PADDING_Y - (hasLabels ? BOX_LABEL_HEIGHT : 0)
	const boxBottom = bottom + BOX_PADDING_Y
	const gapAfter = (i: number) =>
		i >= 0 && i + 1 < layouts.length ? layouts[i + 1].x - (layouts[i].x + layouts[i].w) : Infinity

	return [...participantIndicesByBox].map(([box, indices], boxIndex) => {
		const first = indices[0]
		const last = indices[indices.length - 1]
		// Taking at most a third of the gap on each side keeps two neighboring boxes apart, and keeps
		// a box off the participant beside it.
		const left = layouts[first].x - Math.min(BOX_PADDING_X, gapAfter(first - 1) / 3)
		const right = layouts[last].x + layouts[last].w + Math.min(BOX_PADDING_X, gapAfter(last) / 3)
		const color = parseRgbToTldrawColor(box.fill)
		return {
			id: `box-${boxIndex}`,
			kind: 'sequence_box',
			x: left,
			y: boxTop,
			w: right - left,
			h: boxBottom - boxTop,
			...(color
				? { fill: color.hasAlpha ? 'semi' : 'solid', color: color.color }
				: { fill: 'none', color: 'grey' }),
			size: 's',
			align: 'middle',
			verticalAlign: 'start',
			label: box.name,
			background: true,
		}
	})
}
