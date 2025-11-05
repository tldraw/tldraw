import { Box, JsonValue } from 'tldraw'
import z from 'zod'
import { BlurryShapeSchema } from '../../format/BlurryShape'
import {
	FocusedShapePartialSchema,
	FocusedShapeSchema,
	FocusedShapeTypeSchema,
} from '../../format/FocusedShape'
import { OtherFairySchema } from '../../format/OtherFairy'
import { BoxModelSchema, PeripheralClusterSchema } from '../../format/PeripheralCluster'
import { AgentMessage, AgentMessageContent } from '../../types/AgentMessage'
import { AgentRequest } from '../../types/AgentRequest'
import { ChatHistoryItem } from '../../types/ChatHistoryItem'
import { ContextItem } from '../../types/ContextItem'
import { SharedTodoItemSchema } from '../../types/SharedTodoItem'
import { TodoItemSchema } from '../../types/TodoItem'
import { FairyProjectSchema } from '../FairyProject'
import { PromptPartRegistry } from '../PromptPartRegistry'
import { Wand } from '../Wand'

// BlurryShapesPartSchema
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

// ChatHistoryPartSchema
export type ChatHistoryPart = z.infer<typeof ChatHistoryPartSchema>
export const ChatHistoryPartSchema = z.object({
	type: z.literal('chatHistory'),
	items: z.array(z.any()).nullable(),
})

ChatHistoryPartSchema.register(PromptPartRegistry, {
	priority: -Infinity,
	buildMessages({ items }: ChatHistoryPart) {
		if (!items) return []

		const messages: AgentMessage[] = []
		const priority = -Infinity

		// If the last message is from the user, skip it
		const lastIndex = items.length - 1
		let end = items.length
		if (end > 0 && items[lastIndex].type === 'prompt') {
			end = lastIndex
		}

		for (let i = 0; i < end; i++) {
			const item = items[i]
			const message = buildHistoryItemMessage(item, priority)
			if (message) messages.push(message)
		}

		return messages
	},
})

function buildHistoryItemMessage(item: ChatHistoryItem, priority: number): AgentMessage | null {
	switch (item.type) {
		case 'prompt': {
			const content: AgentMessageContent[] = []

			if (item.message.trim() !== '') {
				content.push({
					type: 'text',
					text: item.message,
				})
			}

			if (item.contextItems.length > 0) {
				for (const contextItem of item.contextItems) {
					switch (contextItem.type) {
						case 'shape': {
							const simpleShape = contextItem.shape
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(simpleShape)}`,
							})
							break
						}
						case 'shapes': {
							const simpleShapes = contextItem.shapes
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(simpleShapes)}`,
							})
							break
						}
						default: {
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(contextItem)}`,
							})
							break
						}
					}
				}
			}

			if (content.length === 0) {
				return null
			}

			return {
				role: 'user',
				content,
				priority,
			}
		}
		case 'continuation': {
			if (item.data.length === 0) {
				return null
			}
			const text = `[DATA RETRIEVED]: ${JSON.stringify(item.data)}`
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
				priority,
			}
		}
		case 'action': {
			const { action } = item
			let text: string
			switch (action._type) {
				case 'message': {
					text = action.text || '<message data lost>'
					break
				}
				case 'think': {
					text = '[THOUGHT]: ' + (action.text || '<thought data lost>')
					break
				}
				default: {
					const { complete: _complete, time: _time, ...rawAction } = action || {}
					text = '[ACTION]: ' + JSON.stringify(rawAction)
					break
				}
			}
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
				priority,
			}
		}
	}
}

// ContextItemsPartSchema
export interface ContextItemsPart {
	type: 'contextItems'
	items: ContextItem[]
	requestType: AgentRequest['type']
}

export const ContextItemsPartSchema = z.object({
	type: z.literal('contextItems'),
	items: z.array(z.any()),
	requestType: z.enum(['user', 'schedule', 'todo', 'augment-user-prompt']),
})

ContextItemsPartSchema.register(PromptPartRegistry, {
	priority: -60,
	buildContent({ items, requestType }: ContextItemsPart) {
		const messages: string[] = []

		const shapeItems = items.filter((item) => item.type === 'shape')
		const shapesItems = items.filter((item) => item.type === 'shapes')
		const areaItems = items.filter((item) => item.type === 'area')
		const pointItems = items.filter((item) => item.type === 'point')

		// Handle area context items
		if (areaItems.length > 0) {
			const isScheduled = requestType === 'schedule'
			const areas = areaItems.map((item) => item.bounds)
			messages.push(
				isScheduled
					? 'You are currently reviewing your work, and you have decided to focus your view on the following area. Make sure to focus your task here.'
					: 'The user has specifically brought your attention to the following areas in this request. The user might refer to them as the "area(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these areas in both your reasoning and actions. Make sure to focus your task on these areas:'
			)
			for (const area of areas) {
				messages.push(JSON.stringify(area))
			}
		}

		// Handle point context items
		if (pointItems.length > 0) {
			const points = pointItems.map((item) => item.point)
			messages.push(
				'The user has specifically brought your attention to the following points in this request. The user might refer to them as the "point(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these points in both your reasoning and actions. Make sure to focus your task on these points:'
			)
			for (const point of points) {
				messages.push(JSON.stringify(point))
			}
		}

		// Handle individual shape context items
		if (shapeItems.length > 0) {
			const shapes = shapeItems.map((item) => item.shape)
			messages.push(
				`The user has specifically brought your attention to these ${shapes.length} shapes individually in this request. Make sure to focus your task on these shapes where applicable:`
			)
			for (const shape of shapes) {
				messages.push(JSON.stringify(shape))
			}
		}

		// Handle groups of shapes context items
		for (const contextItem of shapesItems) {
			const shapes = contextItem.shapes
			if (shapes.length > 0) {
				messages.push(
					`The user has specifically brought your attention to the following group of ${shapes.length} shapes in this request. Make sure to focus your task on these shapes where applicable:`
				)
				messages.push(shapes.map((shape) => JSON.stringify(shape)).join('\n'))
			}
		}

		return messages
	},
})

// CurrentProjectPartSchema
export type CurrentProjectPart = z.infer<typeof CurrentProjectPartSchema>
export const CurrentProjectPartSchema = z
	.object({
		type: z.literal('currentProject'),
		project: FairyProjectSchema.nullable(),
	})
	.meta({
		priority: -10,
	})

CurrentProjectPartSchema.register(PromptPartRegistry, {
	priority: -10,
	buildContent(part: CurrentProjectPart) {
		if (!part.project) {
			return []
		}

		const { id, orchestratorId, name, description, color, memberIds } = part.project

		return [
			'Current Project:',
			`Project ID: ${id}`,
			`Project Name: ${name}`,
			`Project Description: ${description}`,
			`Orchestrator ID: ${orchestratorId}`,
			`Project Color: ${color}`,
			`Member IDs: ${memberIds.join(', ')}`,
		]
	},
})

// DataPartSchema
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

// MessagesPartSchema
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
				return ['User message', ...messages]
			case 'schedule':
				return [...messages]
			case 'todo':
				return [
					'There are still outstanding todo items. Please continue. For your reference, the most recent message I gave you was this:',
					...messages,
				]
		}
	},
})

// OtherFairiesPartSchema
export type OtherFairiesPart = z.infer<typeof OtherFairiesPartSchema>
export const OtherFairiesPartSchema = z.object({
	type: z.literal('otherFairies'),
	otherFairies: z.array(OtherFairySchema),
	thisFairy: OtherFairySchema,
})

OtherFairiesPartSchema.register(PromptPartRegistry, {
	priority: 100,
	buildContent({ otherFairies, thisFairy }: OtherFairiesPart) {
		const messages = [`You: ${JSON.stringify(thisFairy)}`]
		if (otherFairies.length > 0) {
			messages.push(`Other fairies in this document: ${JSON.stringify(otherFairies)}`)
		}

		return messages
	},
})

// PeripheralShapesPartSchema
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

// PersonalityPartSchema
export type PersonalityPart = z.infer<typeof PersonalityPartSchema>
export const PersonalityPartSchema = z.object({
	type: z.literal('personality'),
	personality: z.string(),
})

PersonalityPartSchema.register(PromptPartRegistry, {
	priority: 150,
	buildContent({ personality }: PersonalityPart) {
		if (!personality || personality.trim() === '') {
			return []
		}
		return [
			`You are actually a specific kind of AI agent; a fairy! And so is everyone else (besides the user). So, if you hear other agents (or the user) refer to you or anyone else as a fairy, that's why.`,
			`Your personality is: ${personality}`,
		]
	},
})

// ScreenshotPartSchema
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

// SelectedShapesPartSchema
export type SelectedShapesPart = z.infer<typeof SelectedShapesPartSchema>
export const SelectedShapesPartSchema = z.object({
	type: z.literal('selectedShapes'),
	shapes: z.array(FocusedShapeSchema).nullable(),
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

// SharedTodoListPartSchema
export type SharedTodoListPart = z.infer<typeof SharedTodoListPartSchema>
export const SharedTodoListPartSchema = z
	.object({
		type: z.literal('sharedTodoList'),
		items: z.array(z.intersection(SharedTodoItemSchema, z.object({ fairyName: z.string() }))),
	})
	.meta({
		priority: -10,
	})

SharedTodoListPartSchema.register(PromptPartRegistry, {
	priority: -10,
	buildContent(part: SharedTodoListPart) {
		if (part.items.length === 0) {
			return ['There are no todo list items at the moment.']
		}

		return part.items.map((item) => {
			return `Todo item ${item.id} [${item.status}]: "${item.text}", assigned to ${item.fairyName}`
		})
	},
})

// TimePartSchema
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

// TodoListPartSchema
export type TodoListPart = z.infer<typeof TodoListPartSchema>
export const TodoListPartSchema = z
	.object({
		type: z.literal('todoList'),
		items: z.array(TodoItemSchema),
	})
	.meta({
		priority: -10,
	})

// UserActionHistoryPartSchema
export type UserActionHistoryPart = z.infer<typeof UserActionHistoryPartSchema>
export const UserActionHistoryPartSchema = z.object({
	type: z.literal('userActionHistory'),
	added: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusedShapeTypeSchema,
		})
	),
	removed: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusedShapeTypeSchema,
		})
	),
	updated: z.array(
		z.object({
			shapeId: z.string(),
			type: FocusedShapeTypeSchema,
			before: FocusedShapePartialSchema,
			after: FocusedShapePartialSchema,
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

// ViewportBoundsPartSchema
export type ViewportBoundsPart = z.infer<typeof ViewportBoundsPartSchema>
export const ViewportBoundsPartSchema = z.object({
	type: z.literal('viewportBounds'),
	userBounds: BoxModelSchema.nullable(),
	agentBounds: BoxModelSchema.nullable(),
})

ViewportBoundsPartSchema.register(PromptPartRegistry, {
	priority: -75,
	buildContent({ userBounds, agentBounds }: ViewportBoundsPart) {
		const response = []

		if (agentBounds) {
			response.push(
				`The bounds of the part of the canvas that you can currently see are: ${JSON.stringify(agentBounds)}`
			)
		}
		if (userBounds) {
			const userViewCenter = Box.From(userBounds).center
			response.push(`The user's view is centered at (${userViewCenter.x}, ${userViewCenter.y}).`)
		}

		return response
	},
})

// WandPartSchema
export interface WandPart {
	type: 'wand'
	wand: Wand['type']
}
export const WandPartSchema = z.object({
	type: z.literal('wand'),
	wand: z.string(),
})

// PagesPartSchema
export type PagesPart = z.infer<typeof PagesPartSchema>
export const PagesPartSchema = z.object({
	type: z.literal('pages'),
	pages: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
		})
	),
	currentPageId: z.string(),
	currentPageName: z.string(),
})

PagesPartSchema.register(PromptPartRegistry, {
	priority: -60,
	buildContent(part: PagesPart) {
		const { pages, currentPageName } = part
		if (!pages || pages.length === 0) {
			return ['There are no pages available.']
		}

		const pageList = pages.map((p) => `- ${p.name}`).join('\n')
		return [
			`You are currently on page "${currentPageName}".`,
			`Available pages:\n${pageList}`,
			'You can change to a different page using the "change-page" action, or create a new page using the "create-page" action.',
		]
	},
})

// DebugPartSchema
export type DebugPart = z.infer<typeof DebugPartSchema>
export const DebugPartSchema = z.object({
	type: z.literal('debug'),
	logSystemPrompt: z.boolean(),
	logMessages: z.boolean(),
})

DebugPartSchema.register(PromptPartRegistry, {
	priority: 0,
	buildMessages() {
		// Return empty array - this part is only used for metadata, not for building messages
		return []
	},
})
