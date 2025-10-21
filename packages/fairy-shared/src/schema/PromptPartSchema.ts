import { Box, BoxModel, JsonValue } from 'tldraw'
import z from 'zod'
import { BlurryShapeSchema } from '../format/BlurryShape'
import { BoxModelSchema, PeripheralClusterSchema } from '../format/PeripheralCluster'
import { AgentMessage } from '../types/AgentMessage'
import { TodoItemSchema } from '../types/TodoItem'
import { FocusShapePartialSchema, FocusShapeSchema, FocusShapeTypeSchema } from './FocusShapeSchema'

export const PromptPartRegistry = z.registry<{
	priority: number
	buildContent?(part: any): string[]
	buildMessages?(part: any): AgentMessage[]
}>()

export type BlurryShapesPart = z.infer<typeof BlurryShapesPartSchema>
export const BlurryShapesPartSchema = z.object({
	type: z.literal('blurryShapes'),
	shapes: z.array(BlurryShapeSchema),
})

BlurryShapesPartSchema.register(PromptPartRegistry, {
	priority: -70,
	buildContent(part: BlurryShapesPart) {
		const { shapes } = part
		if (!shapes || shapes.length === 0) {
			return ['There are no shapes in your view at the moment.']
		}

		return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
	},
})

export type ChatHistoryPart = z.infer<typeof ChatHistoryPartSchema>
export const ChatHistoryPartSchema = z.object({
	type: z.literal('chatHistory'),
	// Todo
	items: z.array(z.any()).nullable(),
})

ChatHistoryPartSchema.register(PromptPartRegistry, {
	priority: -Infinity,
	buildContent(_part: ChatHistoryPart) {
		return ['TODO']
	},
})

export type ContextItemsPart = z.infer<typeof ContextItemsPartSchema>
export const ContextItemsPartSchema = z.object({
	type: z.literal('contextItems'),
	// Todo
	items: z.array(z.any()),
	requestType: z.enum(['user', 'schedule', 'todo']),
})

ContextItemsPartSchema.register(PromptPartRegistry, {
	priority: -60,
	buildContent(_part: ContextItemsPart) {
		return ['TODO']
	},
})

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.union([z.boolean(), z.null(), z.string(), z.number()]),
		z.array(JsonValueSchema),
		z.record(z.string(), JsonValueSchema.optional()),
	])
)

export type DataPart = z.infer<typeof DataPartSchema>
export const DataPartSchema = z.object({
	type: z.literal('data'),
	data: z.array(JsonValueSchema),
})

DataPartSchema.register(PromptPartRegistry, {
	priority: 200,
	buildContent({ data }: DataPart) {
		if (data.length === 0) return []

		const formattedData = data.map((item) => {
			return `${JSON.stringify(item)}`
		})

		return ["Here's the data you requested:", ...formattedData]
	},
})

export type MessagesPart = z.infer<typeof MessagesPartSchema>
export const MessagesPartSchema = z.object({
	type: z.literal('messages'),
	messages: z.array(z.string()),
	requestType: z.enum(['user', 'schedule', 'todo']),
})

MessagesPartSchema.register(PromptPartRegistry, {
	priority: Infinity,
	buildContent({ messages, requestType }: MessagesPart) {
		switch (requestType) {
			case 'user':
				return [
					"Using the events provided in the response schema, here's what I want you to do:",
					...messages,
				]
			case 'schedule':
				return [
					"Using the events provided in the response schema, here's what you should do:",
					...messages,
				]
			case 'todo':
				return [
					'There are still outstanding todo items. Please continue. For your reference, the most recent message I gave you was this:',
					...messages,
				]
		}
	},
})

export type PeripheralShapesPart = z.infer<typeof PeripheralShapesPartSchema>
export const PeripheralShapesPartSchema = z.object({
	type: z.literal('peripheralShapes'),
	clusters: z.array(PeripheralClusterSchema).nullable(),
})

PeripheralShapesPartSchema.register(PromptPartRegistry, {
	priority: -65,
	buildContent({ clusters }: PeripheralShapesPart) {
		if (!clusters || clusters.length === 0) {
			return []
		}
		return [
			"There are some groups of shapes in your peripheral vision, outside the your main view. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
			JSON.stringify(clusters),
		]
	},
})

export type ScreenshotPart = z.infer<typeof ScreenshotPartSchema>
export const ScreenshotPartSchema = z.object({
	type: z.literal('screenshot'),
	screenshot: z.string().nullable(),
})

ScreenshotPartSchema.register(PromptPartRegistry, {
	priority: -40,
	buildContent({ screenshot }: ScreenshotPart) {
		if (!screenshot) return []
		return [
			'Here is the part of the canvas that you can currently see at this moment. It is not a reference image.',
			screenshot,
		]
	},
})

export type SelectedShapesPart = z.infer<typeof SelectedShapesPartSchema>
export const SelectedShapesPartSchema = z
	.object({
		type: z.literal('selectedShapes'),
		shapes: z.array(FocusShapeSchema).nullable(),
	})
	.meta({
		priority: -55,
	})

SelectedShapesPartSchema.register(PromptPartRegistry, {
	priority: -55,
	buildContent({ shapes }: SelectedShapesPart) {
		if (!shapes || shapes.length === 0) {
			return []
		}
		return [
			'The user has selected these shapes. Focus your task on these shapes where applicable:',
			JSON.stringify(shapes),
		]
	},
})

export type TimePart = z.infer<typeof TimePartSchema>
export const TimePartSchema = z.object({
	type: z.literal('time'),
	time: z.string(),
})

TimePartSchema.register(PromptPartRegistry, {
	priority: -100,
	buildContent({ time }: TimePart) {
		return ["The user's current time is:", time]
	},
})

export type TodoListPart = z.infer<typeof TodoListPartSchema>
export const TodoListPartSchema = z
	.object({
		type: z.literal('todoList'),
		items: z.array(TodoItemSchema),
	})
	.meta({
		priority: -10,
	})

export type UserActionHistoryPart = z.infer<typeof UserActionHistoryPartSchema>
export const UserActionHistoryPartSchema = z.object({
	type: z.literal('userActionHistory'),
	added: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusShapeTypeSchema,
		})
	),
	removed: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusShapeTypeSchema,
		})
	),
	updated: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusShapeTypeSchema,
			before: FocusShapePartialSchema,
			after: FocusShapePartialSchema,
		})
	),
})

UserActionHistoryPartSchema.register(PromptPartRegistry, {
	priority: -40,
	buildContent(part: UserActionHistoryPart) {
		const { updated, removed, added } = part
		if (updated.length === 0 && removed.length === 0 && added.length === 0) {
			return []
		}
		return [
			'Since the previous request, the user has made the following changes to the canvas:',
			JSON.stringify(part),
		]
	},
})

export type ViewportBoundsPart = z.infer<typeof ViewportBoundsPartSchema>
export const ViewportBoundsPartSchema = z.object({
	type: z.literal('viewportBounds'),
	userBounds: BoxModelSchema.nullable(),
	agentBounds: BoxModelSchema.nullable(),
})

ViewportBoundsPartSchema.register(PromptPartRegistry, {
	priority: -75,
	buildContent({ userBounds, agentBounds }: ViewportBoundsPart) {
		const agentViewportBounds = agentBounds

		if (!agentViewportBounds || !userBounds) return []

		const doUserAndAgentShareViewport =
			withinPercent(agentViewportBounds.x, userBounds.x, 5) &&
			withinPercent(agentViewportBounds.y, userBounds.y, 5) &&
			withinPercent(agentViewportBounds.w, userBounds.w, 5) &&
			withinPercent(agentViewportBounds.h, userBounds.h, 5)

		const agentViewportBoundsBox = Box.From(agentViewportBounds)
		const currentUserViewportBoundsBox = Box.From(userBounds)

		const agentContainsUser = agentViewportBoundsBox.contains(currentUserViewportBoundsBox)
		const userContainsAgent = currentUserViewportBoundsBox.contains(agentViewportBoundsBox)

		let relativeViewportDescription: string = ''

		if (doUserAndAgentShareViewport) {
			relativeViewportDescription = 'is the same as'
		} else {
			if (agentContainsUser) {
				relativeViewportDescription = 'contains'
			} else if (userContainsAgent) {
				relativeViewportDescription = 'is contained by'
			} else {
				relativeViewportDescription = getRelativePositionDescription(
					agentViewportBounds,
					userBounds
				)
			}
		}
		const response = [
			`The bounds of the part of the canvas that you can currently see are:`,
			JSON.stringify(agentBounds),
			`The user's view is ${relativeViewportDescription} your view.`,
		]

		if (!doUserAndAgentShareViewport) {
			// If the user and agent share a viewport, we don't need to say anything about the bounds
			response.push(`The bounds of what the user can see are:`, JSON.stringify(userBounds))
		}

		return response
	},
})

function withinPercent(a: number, b: number, percent: number) {
	const max = Math.max(Math.abs(a), Math.abs(b), 1)
	return Math.abs(a - b) <= (percent / 100) * max
}

/**
 * Determines the relative position of box B from box A's perspective.
 */
function getRelativePositionDescription(boxA: BoxModel, boxB: BoxModel): string {
	// Find centers of both boxes
	const centerA = {
		x: boxA.x + boxA.w / 2,
		y: boxA.y + boxA.h / 2,
	}

	const centerB = {
		x: boxB.x + boxB.w / 2,
		y: boxB.y + boxB.h / 2,
	}

	// Calculate the difference vector from A to B
	const dx = centerB.x - centerA.x
	const dy = centerB.y - centerA.y

	// Handle the case where centers are the same
	if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
		return 'is concentric with'
	}

	// Calculate angle from A to B (in radians)
	const angle = Math.atan2(dy, dx)

	// Convert to degrees and normalize to 0-360
	let degrees = (angle * 180) / Math.PI
	if (degrees < 0) degrees += 360

	// Map degrees to 8 cardinal/ordinal directions
	// 0° = right, 90° = bottom, 180° = left, 270° = top
	if (degrees >= 337.5 || degrees < 22.5) return 'to the right of'
	if (degrees >= 22.5 && degrees < 67.5) return 'to the bottom right of'
	if (degrees >= 67.5 && degrees < 112.5) return 'below'
	if (degrees >= 112.5 && degrees < 157.5) return 'to the bottom left of'
	if (degrees >= 157.5 && degrees < 202.5) return 'to the left of'
	if (degrees >= 202.5 && degrees < 247.5) return 'to the top left of'
	if (degrees >= 247.5 && degrees < 292.5) return 'above'
	if (degrees >= 292.5 && degrees < 337.5) return 'to the top right of'

	return 'is different from'
}
