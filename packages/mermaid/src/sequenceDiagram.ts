import type { Actor, Message } from 'mermaid/dist/diagrams/sequence/types.js'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
	MermaidBlueprintLineNode,
} from './blueprint'
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
import { getAccumulatedTranslate } from './svgParsing'
import { sanitizeDiagramText } from './utils'

const TARGET_ACTOR_SPACING = 300
const MIN_VERTICAL_GAP = 400
const FALLBACK_ACTOR_WIDTH = 200
const FALLBACK_ACTOR_HEIGHT = 70
const FALLBACK_ACTOR_SPACING = 100
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

interface SvgRect {
	x: number
	y: number
	w: number
	h: number
}
interface ActorLayout {
	x: number
	y: number
	w: number
	h: number
	bottomY: number
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

function computeActorLayouts(root: Element, actorCount: number): ActorLayout[] {
	const byX = (a: SvgRect, b: SvgRect) => a.x - b.x
	let top = parseSvgRects(root, 'rect.actor-top').sort(byX)
	let bottom = parseSvgRects(root, 'rect.actor-bottom').sort(byX)

	if (top.length < actorCount || bottom.length < actorCount) {
		const all = parseSvgRects(root, 'rect[class*="actor"]').sort((a, b) => a.y - b.y)
		if (all.length >= 2 * actorCount) {
			let maxGap = 0,
				splitAt = actorCount
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

	if (top.length >= actorCount && bottom.length >= actorCount) {
		const maxTopWidth = Math.max(...top.map((r) => r.w))
		const startX = -((actorCount - 1) * TARGET_ACTOR_SPACING + maxTopWidth) / 2
		const topBottomEdge = Math.max(...top.map((r) => r.y + r.h))
		const bottomTopEdge = Math.min(...bottom.map((r) => r.y))
		const yStretch = Math.max(0, MIN_VERTICAL_GAP - (bottomTopEdge - topBottomEdge))
		const topMinY = Math.min(...top.map((r) => r.y))
		const originY = -(Math.max(...bottom.map((r) => r.y + r.h)) + yStretch + topMinY) / 2

		return top.map((topRect, i) => {
			const w = topRect.w + ACTOR_PADDING_WIDTH
			const h = topRect.h + ACTOR_PADDING_HEIGHT
			return {
				x: startX + i * TARGET_ACTOR_SPACING - w / 2,
				y: originY + topRect.y,
				w,
				h,
				bottomY: originY + bottom[i].y + yStretch,
			}
		})
	}

	const totalWidth = actorCount * FALLBACK_ACTOR_WIDTH + (actorCount - 1) * FALLBACK_ACTOR_SPACING
	const totalHeight = FALLBACK_ACTOR_HEIGHT * 2 + 300
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
	return typeof msg.message === 'string' ? sanitizeDiagramText(msg.message) : undefined
}

/**
 * Build a complete blueprint for a sequence diagram:
 * top actors, lifelines, bottom actors, fragments, notes, and signal edges.
 */
export function sequenceToBlueprint(
	root: Element,
	actors: Map<string, Actor>,
	actorKeys: string[],
	messages: Message[],
	lineType: MermaidLinetype,
	placement: MermaidPlacement
): DiagramMermaidBlueprint {
	const actorCount = actorKeys.length
	const keyIndex = new Map(actorKeys.map((key, i) => [key, i]))
	const layouts = computeActorLayouts(root, actorCount)

	// Parse fragments and events
	const fragments: {
		keyword: string
		title: string
		firstEventIndex: number
		lastEventIndex: number
		actorKeys: Set<string>
	}[] = []
	const fragmentStack: {
		keyword: string
		title: string
		firstEventIndex: number
		actorKeys: Set<string>
	}[] = []
	const events: Message[] = []

	for (const msg of messages) {
		const keyword = getFragmentStartKeyword(msg.type, lineType)
		if (keyword) {
			fragmentStack.push({
				keyword,
				title: getMessageLabel(msg) ?? '',
				firstEventIndex: events.length,
				actorKeys: new Set(),
			})
			continue
		}
		if (isFragmentEnd(msg.type, lineType)) {
			const frag = fragmentStack.pop()
			if (frag) fragments.push({ ...frag, lastEventIndex: events.length - 1 })
			continue
		}
		if (
			(isSignalMessage(msg.type, lineType) && msg.from && msg.to) ||
			(isNoteMessage(msg.type, lineType) && msg.from)
		) {
			for (const frag of fragmentStack) {
				if (msg.from) frag.actorKeys.add(msg.from)
				if (msg.to) frag.actorKeys.add(msg.to)
			}
			events.push(msg)
		}
	}

	// Build blueprint
	const svgNoteRects = parseSvgRects(root, 'rect.note')
	let svgNoteIndex = 0
	const nodes: MermaidBlueprintGeoNode[] = []
	const lines: MermaidBlueprintLineNode[] = []
	const edges: MermaidBlueprintEdge[] = []

	for (let i = 0; i < actorCount; i++) {
		const key = actorKeys[i]
		const actor = actors.get(key)
		if (!actor) continue
		const { x, y, w, h, bottomY } = layouts[i]
		const shared = {
			geo: mapParticipantTypeToGeo(actor.type),
			label: actor.description || actor.name || key,
			align: 'middle' as const,
			verticalAlign: 'middle' as const,
			size: 's' as const,
		}
		nodes.push({ id: `actor-top-${key}`, x, y, w, h, ...shared })
		const llh = bottomY - (y + h)
		if (llh > 0) lines.push({ id: `lifeline-${key}`, x: x + w / 2, y: y + h, endY: llh })
		nodes.push({ id: `actor-bottom-${key}`, x, y: bottomY, w, h, ...shared })
	}

	const { y: firstY, h: firstH, bottomY: firstBottomY } = layouts[0]
	const lifelineTop = firstY + firstH
	const eventStep = (firstBottomY - lifelineTop) / (events.length + 1)

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
		nodes.push({
			id: `fragment-${fragmentIndex}`,
			x: leftX,
			y: fragTop,
			w: layouts[maxIndex].x + layouts[maxIndex].w + FRAGMENT_PADDING_X - leftX,
			h: fragBottom - fragTop,
			geo: 'rectangle',
			dash: 'dashed',
			fill: 'none',
			color: 'light-blue',
			size: 's',
			align: 'start',
			verticalAlign: 'start',
			label: `${fragment.keyword} [${fragment.title}]`,
		})
	}

	for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
		const msg = events[eventIndex]
		const anchor = (eventIndex + 1) / (events.length + 1)
		const eventY = lifelineTop + eventStep * (eventIndex + 1)

		if (isSignalMessage(msg.type, lineType)) {
			const fromKey = msg.from!,
				toKey = msg.to!
			if (!keyIndex.has(fromKey) || !keyIndex.has(toKey)) continue
			const msgType = msg.type ?? lineType.SOLID
			const { dash, arrowheadEnd } = mapLineTypeToArrowProps(msgType, lineType)
			const isSelf = fromKey === toKey
			edges.push({
				startNodeId: `lifeline-${fromKey}`,
				endNodeId: `lifeline-${toKey}`,
				label: getMessageLabel(msg),
				bend: isSelf ? SELF_MSG_BEND : 0,
				dash,
				arrowheadEnd,
				arrowheadStart: isSelf ? 'none' : isBidirectional(msgType, lineType) ? 'arrow' : 'none',
				size: 's',
				anchorStartY: isSelf ? anchor - SELF_MSG_Y_OFFSET : anchor,
				anchorEndY: isSelf ? anchor + SELF_MSG_Y_OFFSET : anchor,
				isExact: true,
				isPrecise: true,
			})
		} else if (isNoteMessage(msg.type, lineType)) {
			const fromKey = msg.from!
			const fromIdx = keyIndex.get(fromKey),
				toIdx = keyIndex.get(msg.to ?? fromKey)
			if (fromIdx === undefined) continue
			const label = getMessageLabel(msg)
			const msgPlacement = msg.placement as unknown as number | undefined
			const fromCenterX = layouts[fromIdx].x + layouts[fromIdx].w / 2
			const toCenterX = toIdx !== undefined ? layouts[toIdx].x + layouts[toIdx].w / 2 : fromCenterX
			const isSpanning =
				msgPlacement === placement.OVER && msg.from !== msg.to && toIdx !== undefined

			const svgNote = svgNoteRects[svgNoteIndex++]
			const noteHeight = svgNote?.h ?? FALLBACK_NOTE_HEIGHT
			const textWidth = label ? label.length * NOTE_CHAR_WIDTH + NOTE_TEXT_PADDING : 0
			const baseWidth = Math.max(svgNote?.w ?? FALLBACK_NOTE_WIDTH, textWidth)
			const noteWidth = isSpanning
				? Math.max(baseWidth, Math.abs(toCenterX - fromCenterX) + NOTE_PADDING)
				: baseWidth

			const noteX =
				msgPlacement === placement.LEFTOF
					? fromCenterX - noteWidth - NOTE_PADDING
					: msgPlacement === placement.RIGHTOF
						? fromCenterX + NOTE_PADDING
						: isSpanning
							? (fromCenterX + toCenterX) / 2 - noteWidth / 2
							: fromCenterX - noteWidth / 2

			nodes.push({
				id: `note-${eventIndex}`,
				x: noteX,
				y: eventY - noteHeight / 2,
				w: noteWidth,
				h: noteHeight,
				geo: 'rectangle',
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
		nodes,
		edges,
		lines,
		groups: actorKeys.map((key) => [`actor-top-${key}`, `lifeline-${key}`, `actor-bottom-${key}`]),
	}
}
