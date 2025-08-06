import z from 'zod'
import { SimpleShape } from '../simple/SimpleShape'

export const AgentCreateEvent = z.object({
	_type: z.literal('create'),
	intent: z.string(),
	shape: SimpleShape,
})

export type IAgentCreateEvent = z.infer<typeof AgentCreateEvent>

export const AgentUpdateEvent = z.object({
	_type: z.literal('update'),
	intent: z.string(),
	update: SimpleShape,
})

export type IAgentUpdateEvent = z.infer<typeof AgentUpdateEvent>

export const AgentMoveEvent = z.object({
	_type: z.literal('move'),
	intent: z.string(),
	shapeId: z.string(),
	x: z.number(),
	y: z.number(),
})

export type IAgentMoveEvent = z.infer<typeof AgentMoveEvent>

export const AgentLabelEvent = z.object({
	_type: z.literal('label'),
	intent: z.string(),
	shapeId: z.string(),
	text: z.string(),
})

export type IAgentLabelEvent = z.infer<typeof AgentLabelEvent>

const AgentDeleteEvent = z.object({
	_type: z.literal('delete'),
	intent: z.string(),
	shapeId: z.string(),
})

export type IAgentDeleteEvent = z.infer<typeof AgentDeleteEvent>

const AgentThinkEvent = z.object({
	_type: z.enum(['think', 'message']),
	text: z.string(),
})

export type IAgentThinkEvent = z.infer<typeof AgentThinkEvent>

const AgentReviewEvent = z.object({
	_type: z.literal('review'),
	h: z.number(),
	intent: z.string(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type IAgentReviewEvent = z.infer<typeof AgentReviewEvent>

const AgentSetMyViewEvent = z.object({
	_type: z.literal('setMyView'),
	h: z.number(),
	intent: z.string(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

export type IAgentScheduleSetMyViewEvent = z.infer<typeof AgentSetMyViewEvent>

const AgentDistributeEvent = z.object({
	_type: z.literal('distribute'),
	direction: z.enum(['horizontal', 'vertical']),
	intent: z.string(),
	shapeIds: z.array(z.string()),
})

export type IAgentDistributeEvent = z.infer<typeof AgentDistributeEvent>

const AgentStackEvent = z.object({
	_type: z.literal('stack'),
	direction: z.enum(['vertical', 'horizontal']),
	gap: z.number(),
	intent: z.string(),
	shapeIds: z.array(z.string()),
})
export type IAgentStackEvent = z.infer<typeof AgentStackEvent>

const AgentAlignEvent = z.object({
	_type: z.literal('align'),
	alignment: z.enum(['top', 'bottom', 'left', 'right', 'center-horizontal', 'center-vertical']),
	gap: z.number(),
	intent: z.string(),
	shapeIds: z.array(z.string()),
})
export type IAgentAlignEvent = z.infer<typeof AgentAlignEvent>

const AgentPlaceEvent = z.object({
	_type: z.literal('place'),
	intent: z.string(),
	shapeId: z.string(),
	referenceShapeId: z.string(),
	side: z.enum(['top', 'bottom', 'left', 'right']),
	sideOffset: z.number(),
	align: z.enum(['start', 'center', 'end']),
	alignOffset: z.number(),
})
export type IAgentPlaceEvent = z.infer<typeof AgentPlaceEvent>

export const AgentEvent = z.union([
	AgentThinkEvent,
	AgentCreateEvent,
	AgentUpdateEvent,
	AgentDeleteEvent,
	AgentMoveEvent,
	AgentLabelEvent,
	AgentDistributeEvent,
	AgentStackEvent,
	AgentAlignEvent,
	AgentPlaceEvent,
	AgentReviewEvent,
	AgentSetMyViewEvent,
])

export type IAgentEvent = z.infer<typeof AgentEvent>
