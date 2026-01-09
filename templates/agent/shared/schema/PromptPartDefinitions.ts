import { Box, BoxModel, JsonValue } from 'tldraw'
import { BlurryShape } from '../format/BlurryShape'
import { PeripheralShapeCluster } from '../format/PeripheralShapesCluster'
import { SimpleShape } from '../format/SimpleShape'
import { AgentModelName } from '../models'
import type { AgentAction } from '../types/AgentAction'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { AgentRequest } from '../types/AgentRequest'
import { ChatHistoryItem } from '../types/ChatHistoryItem'
import { ContextItem } from '../types/ContextItem'
import type { PromptPart, PromptPartDefinition } from '../types/PromptPart'
import { TodoItem } from '../types/TodoItem'

// ============================================================================
// Prompt Part Type Interfaces
// ============================================================================

export interface BlurryShapesPart {
	type: 'blurryShapes'
	shapes: BlurryShape[]
}

export interface ChatHistoryPart {
	type: 'chatHistory'
	history: ChatHistoryItem[]
}

export interface ContextItemsPart {
	type: 'contextItems'
	items: ContextItem[]
	requestSource: AgentRequest['source']
}

export interface DataPart {
	type: 'data'
	data: JsonValue[]
}

export interface MessagesPart {
	type: 'messages'
	messages: string[]
	requestSource: AgentRequest['source']
}

export interface ModelNamePart {
	type: 'modelName'
	modelName: AgentModelName
}

export interface PeripheralShapesPart {
	type: 'peripheralShapes'
	clusters: PeripheralShapeCluster[]
}

export interface ScreenshotPart {
	type: 'screenshot'
	screenshot: string
}

export interface SelectedShapesPart {
	type: 'selectedShapes'
	shapes: SimpleShape[]
}

export interface TimePart {
	type: 'time'
	timestamp: number
}

export interface TodoListPart {
	type: 'todoList'
	items: TodoItem[]
}

export interface UserActionHistoryPart {
	type: 'userActionHistory'
	added: {
		shapeId: string
		type: SimpleShape['_type']
	}[]
	removed: {
		shapeId: string
		type: SimpleShape['_type']
	}[]
	updated: {
		shapeId: string
		type: SimpleShape['_type']
		before: Partial<SimpleShape>
		after: Partial<SimpleShape>
	}[]
}

export interface ViewportBoundsPart {
	type: 'viewportBounds'
	userBounds: BoxModel
	agentBounds: BoxModel
}

export interface ModePart {
	type: 'mode'
	modeType: string
	partTypes: PromptPart['type'][]
	actionTypes: AgentAction['_type'][]
}

// ============================================================================
// Prompt Part Definitions
// ============================================================================

// BlurryShapes
export const BlurryShapesPartDefinition: PromptPartDefinition<BlurryShapesPart> = {
	type: 'blurryShapes',
	priority: -70,
	buildContent: ({ shapes }) => {
		if (shapes.length === 0) return ['There are no shapes in your view at the moment.']
		return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
	},
}

// ChatHistory
const CHAT_HISTORY_PRIORITY = 999999 // history should appear first in the prompt (low priority)

export const ChatHistoryPartDefinition: PromptPartDefinition<ChatHistoryPart> = {
	type: 'chatHistory',
	priority: CHAT_HISTORY_PRIORITY,
	buildMessages: ({ history }) => {
		if (history.length === 0) return []

		const messages: AgentMessage[] = []

		// If the last message is from the user, skip it
		const lastIndex = history.length - 1
		let end = history.length
		if (end > 0 && history[lastIndex].type === 'prompt') {
			end = lastIndex
		}

		for (let i = 0; i < end; i++) {
			const item = history[i]
			const message = buildHistoryItemMessage(item, CHAT_HISTORY_PRIORITY)
			if (message) messages.push(message)
		}

		return messages
	},
}

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

// ContextItems
export const ContextItemsPartDefinition: PromptPartDefinition<ContextItemsPart> = {
	type: 'contextItems',
	priority: -55, // context items in middle
	buildContent: ({ items, requestSource }) => {
		const messages: string[] = []

		const shapeItems = items.filter((item) => item.type === 'shape')
		const shapesItems = items.filter((item) => item.type === 'shapes')
		const areaItems = items.filter((item) => item.type === 'area')
		const pointItems = items.filter((item) => item.type === 'point')

		// Handle area context items
		if (areaItems.length > 0) {
			const isSelf = requestSource === 'self'
			const areas = areaItems.map((item) => item.bounds)
			messages.push(
				isSelf
					? 'You have decided to focus your view on the following area. Make sure to focus your task here.'
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
}

// Data
export const DataPartDefinition: PromptPartDefinition<DataPart> = {
	type: 'data',
	priority: 200, // API data should come right before the user message but after most other parts
	buildContent: ({ data }) => {
		if (data.length === 0) return []

		const formattedData = data.map((item) => {
			return `${JSON.stringify(item)}`
		})

		return ["Here's the data you requested:", ...formattedData]
	},
}

// Messages
export const MessagesPartDefinition: PromptPartDefinition<MessagesPart> = {
	type: 'messages',
	priority: Infinity, // user message should be last (highest priority)
	buildContent: ({ messages, requestSource }) => {
		switch (requestSource) {
			// we treat all sources the same for the messages part, but you don't have to!
			case 'user':
			case 'self':
			case 'other-agent':
				return messages
		}
	},
}

// ModelName
export const ModelNamePartDefinition: PromptPartDefinition<ModelNamePart> = {
	type: 'modelName',
	getModelName: (part) => {
		return part.modelName
	},
}

// PeripheralShapes
export const PeripheralShapesPartDefinition: PromptPartDefinition<PeripheralShapesPart> = {
	type: 'peripheralShapes',
	priority: -65, // peripheral content after viewport shapes
	buildContent: ({ clusters }) => {
		if (clusters.length === 0) {
			return []
		}

		return [
			"There are some groups of shapes in your peripheral vision, outside the your main view. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
			JSON.stringify(clusters),
		]
	},
}

// Screenshot
export const ScreenshotPartDefinition: PromptPartDefinition<ScreenshotPart> = {
	type: 'screenshot',
	priority: -40, // screenshot after text content
	buildContent: ({ screenshot }) => {
		if (screenshot === '') return []

		return [
			'Here is the part of the canvas that you can currently see at this moment. It is not a reference image.',
			screenshot,
		]
	},
}

// SelectedShapes
export const SelectedShapesPartDefinition: PromptPartDefinition<SelectedShapesPart> = {
	type: 'selectedShapes',
	priority: -55, // selected shapes after context items
	buildContent: ({ shapes }) => {
		if (shapes.length === 0) {
			return []
		}

		return [
			'The user has selected these shapes. Focus your task on these shapes where applicable:',
			shapes.map((shape) => JSON.stringify(shape)).join('\n'),
		]
	},
}

// Time
export const TimePartDefinition: PromptPartDefinition<TimePart> = {
	type: 'time',
	priority: -100,
	buildContent: ({ timestamp }) => {
		return ["The user's current time is:", new Date(timestamp).toLocaleTimeString()]
	},
}

// TodoList
export const TodoListPartDefinition: PromptPartDefinition<TodoListPart> = {
	type: 'todoList',
	priority: 10,
	buildContent: ({ items }) => {
		if (items.length === 0)
			return [
				'You have no todos yet. Use the `update-todo-list` event with a new id to create a todo.',
			]
		return [`Here is your current todo list:`, JSON.stringify(items)]
	},
}

// UserActionHistory
export const UserActionHistoryPartDefinition: PromptPartDefinition<UserActionHistoryPart> = {
	type: 'userActionHistory',
	priority: -40,
	buildContent: (part) => {
		const { updated, removed, added } = part
		if (updated.length === 0 && removed.length === 0 && added.length === 0) {
			return []
		}

		return [
			'Since the previous request, the user has made the following changes to the canvas:',
			JSON.stringify(part),
		]
	},
}

// ViewportBounds
export const ViewportBoundsPartDefinition: PromptPartDefinition<ViewportBoundsPart> = {
	type: 'viewportBounds',
	priority: -80, // viewport bounds
	buildContent: ({ userBounds, agentBounds }) => {
		const agentViewportBounds = agentBounds

		// Check if bounds are valid (non-zero dimensions)
		if (
			agentViewportBounds.w === 0 ||
			agentViewportBounds.h === 0 ||
			userBounds.w === 0 ||
			userBounds.h === 0
		)
			return []

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
}

// Mode - sends mode metadata to worker for prompt construction
export const ModePartDefinition: PromptPartDefinition<ModePart> = {
	type: 'mode',
	// No buildContent - this is metadata for the worker, not prompt content for the model
}

function withinPercent(a: number, b: number, percent: number) {
	const max = Math.max(Math.abs(a), Math.abs(b), 1)
	return Math.abs(a - b) <= (percent / 100) * max
}

/**
 * Determines the relative position of box B from box A's perspective.
 */
export function getRelativePositionDescription(boxA: BoxModel, boxB: BoxModel): string {
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
