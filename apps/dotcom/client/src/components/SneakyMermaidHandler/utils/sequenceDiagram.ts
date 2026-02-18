import type { Actor, Message } from 'mermaid/dist/diagrams/sequence/types.js'
import { createShapeId, Editor, TLArrowShapeProps, TLGeoShape, TLShapeId, toRichText } from 'tldraw'
import {
	isBidirectional,
	isSignalMessage,
	mapLineTypeToArrowProps,
	mapParticipantTypeToGeo,
} from './mappings'

const ACTOR_WIDTH = 200
const ACTOR_HEIGHT = 70
const ACTOR_SPACING = 100
const MESSAGE_SPACING = 80
const MESSAGE_START_Y = ACTOR_HEIGHT + 40
const SELF_MESSAGE_BEND = 50

export function createMermaidSequenceDiagram(
	editor: Editor,
	actors: Map<string, Actor>,
	actorKeys: string[],
	messages: Message[]
) {
	const offset = editor.getViewportPageBounds().center

	const signalMessages = messages.filter((m) => isSignalMessage(m.type))
	const totalWidth = actorKeys.length * ACTOR_WIDTH + (actorKeys.length - 1) * ACTOR_SPACING
	const BOTTOM_ACTOR_GAP = 20
	const totalHeight =
		MESSAGE_START_Y + signalMessages.length * MESSAGE_SPACING + BOTTOM_ACTOR_GAP + ACTOR_HEIGHT + 40

	const startX = offset.x - totalWidth / 2
	const startY = offset.y - totalHeight / 2

	const topActorShapeIds = new Map<string, TLShapeId>()
	const bottomActorShapeIds = new Map<string, TLShapeId>()
	const actorCenterXs = new Map<string, number>()

	// Create top actor boxes
	for (let i = 0; i < actorKeys.length; i++) {
		const key = actorKeys[i]
		const actor = actors.get(key)
		if (!actor) continue

		const x = startX + i * (ACTOR_WIDTH + ACTOR_SPACING)
		const centerX = x + ACTOR_WIDTH / 2
		actorCenterXs.set(key, centerX)

		const shapeId = createShapeId()
		topActorShapeIds.set(key, shapeId)

		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x,
			y: startY,
			props: {
				geo: mapParticipantTypeToGeo(actor.type),
				w: ACTOR_WIDTH,
				h: ACTOR_HEIGHT,
				richText: toRichText(actor.description || actor.name || key),
				align: 'middle',
				verticalAlign: 'middle',
				size: 'm',
			},
		})
	}

	// Create bottom actor boxes (mirroring the top)
	const lifelineEndY =
		startY + MESSAGE_START_Y + signalMessages.length * MESSAGE_SPACING + BOTTOM_ACTOR_GAP
	const bottomActorY = lifelineEndY
	for (let i = 0; i < actorKeys.length; i++) {
		const key = actorKeys[i]
		const actor = actors.get(key)
		if (!actor) continue

		const x = startX + i * (ACTOR_WIDTH + ACTOR_SPACING)
		const shapeId = createShapeId()
		bottomActorShapeIds.set(key, shapeId)

		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x,
			y: bottomActorY,
			props: {
				geo: mapParticipantTypeToGeo(actor.type),
				w: ACTOR_WIDTH,
				h: ACTOR_HEIGHT,
				richText: toRichText(actor.description || actor.name || key),
				align: 'middle',
				verticalAlign: 'middle',
				size: 'm',
			},
		})
	}

	// Draw lifelines bound from top actor to bottom actor
	for (const key of actorKeys) {
		const topId = topActorShapeIds.get(key)
		const bottomId = bottomActorShapeIds.get(key)
		if (!topId || !bottomId) continue

		const centerX = actorCenterXs.get(key)
		if (centerX === undefined) continue

		const arrowId = createShapeId()
		const lifelineTopY = startY + ACTOR_HEIGHT

		editor.createShape({
			id: arrowId,
			type: 'arrow',
			x: centerX,
			y: lifelineTopY,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 0, y: lifelineEndY - lifelineTopY },
				dash: 'dotted',
				arrowheadStart: 'none',
				arrowheadEnd: 'none',
				size: 's',
			} satisfies Partial<TLArrowShapeProps>,
		})

		editor.createBindings([
			{
				fromId: arrowId,
				toId: topId,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 1 },
					isExact: true,
					isPrecise: true,
				},
			},
			{
				fromId: arrowId,
				toId: bottomId,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0 },
					isExact: true,
					isPrecise: true,
				},
			},
		])
	}

	// Draw message arrows
	let signalIndex = 0
	for (const msg of messages) {
		if (!isSignalMessage(msg.type)) continue

		const fromKey = msg.from
		const toKey = msg.to
		if (!fromKey || !toKey) {
			signalIndex++
			continue
		}

		const fromX = actorCenterXs.get(fromKey)
		const toX = actorCenterXs.get(toKey)
		if (fromX === undefined || toX === undefined) {
			signalIndex++
			continue
		}

		const msgY = startY + MESSAGE_START_Y + signalIndex * MESSAGE_SPACING
		const arrowProps = mapLineTypeToArrowProps(msg.type ?? 0)
		const isSelfMessage = fromKey === toKey

		const arrowId = createShapeId()
		const label = typeof msg.message === 'string' ? msg.message : undefined

		if (isSelfMessage) {
			editor.createShape({
				id: arrowId,
				type: 'arrow',
				x: fromX,
				y: msgY,
				props: {
					start: { x: 0, y: 0 },
					end: { x: 0, y: MESSAGE_SPACING * 0.6 },
					dash: arrowProps.dash,
					arrowheadStart: 'none',
					arrowheadEnd: arrowProps.arrowheadEnd,
					bend: SELF_MESSAGE_BEND,
					richText: label ? toRichText(label) : undefined,
					size: 'm',
				},
			})
		} else {
			const minX = Math.min(fromX, toX)

			editor.createShape({
				id: arrowId,
				type: 'arrow',
				x: minX,
				y: msgY,
				props: {
					start: { x: fromX - minX, y: 0 },
					end: { x: toX - minX, y: 0 },
					dash: arrowProps.dash,
					arrowheadStart: isBidirectional(msg.type ?? 0) ? arrowProps.arrowheadEnd : 'none',
					arrowheadEnd: arrowProps.arrowheadEnd,
					richText: label ? toRichText(label) : undefined,
					size: 'm',
				},
			})
		}

		signalIndex++
	}
}
