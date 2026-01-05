import { Box, BoxModel, JsonValue } from 'tldraw'
import { BlurryShape } from '../format/BlurryShape'
import { PeripheralShapeCluster } from '../format/PeripheralShapesCluster'
import { getSimpleShapeSchemaNames, SimpleShape } from '../format/SimpleShape'
import { AgentModelName } from '../models'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { AgentRequest } from '../types/AgentRequest'
import { ChatHistoryItem } from '../types/ChatHistoryItem'
import { ContextItem } from '../types/ContextItem'
import { TodoItem } from '../types/TodoItem'
import { buildResponseSchema } from './buildResponseSchema'

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
	requestType: AgentRequest['type']
}

export interface DataPart {
	type: 'data'
	data: JsonValue[]
}

export interface MessagesPart {
	type: 'messages'
	messages: string[]
	requestType: AgentRequest['type']
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

export interface SystemPromptPart {
	type: 'systemPrompt'
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

// ============================================================================
// Prompt Part Definitions
// ============================================================================

/**
 * A prompt part definition contains pure transformation functions for converting
 * prompt part data into messages, content, or system prompts.
 */
export interface PromptPartDefinition<T extends { type: string }> {
	type: T['type']
	priority?: number
	buildContent?(part: T): string[]
	buildMessages?(part: T): AgentMessage[]
	buildSystemPrompt?(part: T): string | null
	getModelName?(part: T): AgentModelName | null
}

// BlurryShapes
export const BlurryShapesPartDefinition: PromptPartDefinition<BlurryShapesPart> = {
	type: 'blurryShapes',
	priority: 70,
	buildContent: ({ shapes }) => {
		if (shapes.length === 0) return ['There are no shapes in your view at the moment.']
		return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
	},
}

// ChatHistory
export const ChatHistoryPartDefinition: PromptPartDefinition<ChatHistoryPart> = {
	type: 'chatHistory',
	priority: Infinity, // history should appear first in the prompt (low priority)
	buildMessages: ({ history }) => {
		if (history.length === 0) return []

		const messages: AgentMessage[] = []
		const priority = ChatHistoryPartDefinition.priority!

		// If the last message is from the user, skip it
		const lastIndex = history.length - 1
		let end = history.length
		if (end > 0 && history[lastIndex].type === 'prompt') {
			end = lastIndex
		}

		for (let i = 0; i < end; i++) {
			const item = history[i]
			const message = buildHistoryItemMessage(item, priority)
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
	priority: 60, // context items in middle (low priority)
	buildContent: ({ items, requestType }) => {
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
}

// Data
export const DataPartDefinition: PromptPartDefinition<DataPart> = {
	type: 'data',
	priority: -200, // API data should come right before the user message but after most other parts
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
	priority: -Infinity, // user message should be last (highest priority)
	buildContent: ({ messages, requestType }) => {
		let responsePart: string[] = []
		switch (requestType) {
			case 'user':
				responsePart = getUserPrompt(messages)
				break
			case 'schedule':
				responsePart = getSchedulePrompt(messages)
				break
			case 'todo':
				responsePart = getTodoPrompt(messages)
				break
		}

		return responsePart
	},
}

function getUserPrompt(message: string[]) {
	return [
		`Using the events provided in the response schema, here's what I want you to do:`,
		...message,
	]
}

function getSchedulePrompt(message: string[]) {
	return [
		"Using the events provided in the response schema, here's what you should do:",
		...message,
	]
}

function getTodoPrompt(message: string[]) {
	return [
		'There are still outstanding todo items. Please continue. For your reference, the most recent message I gave you was this:',
		...message,
	]
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
	priority: 65, // peripheral content after viewport shapes (low priority)
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
	priority: 40, // screenshot after text content (medium priority)
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
	priority: 55, // selected shapes after context items (low priority)
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

// SystemPrompt
export const SystemPromptPartDefinition: PromptPartDefinition<SystemPromptPart> = {
	type: 'systemPrompt',
	buildSystemPrompt: (_part) => {
		return getSystemPrompt()
	},
}

const shapeTypeNames = getSimpleShapeSchemaNames()

function getSystemPrompt() {
	return `# System Prompt

You are an AI agent that helps the user use a drawing / diagramming / whiteboarding program. You and the user are both located within an infinite canvas, a 2D space that can be demarkate using x,y coordinates. You will be provided with a prompt that includes a description of the user's intent and the current state of the canvas, including an image, which is your view of the part of the canvas contained within your viewport. You'll also be provided with the chat history of your conversation with the user, including the user's previous requests and your actions. Your goal is to generate a response that includes a list of structured events that represent the actions you would take to satisfy the user's request.

You respond with structured JSON data based on a predefined schema.

## Schema Overview

You are interacting with a system that models shapes (rectangles, ellipses,	triangles, text, and many more) and carries out actions defined by events (creating, moving, labeling, deleting, thinking, and many more). Your response should include:

- **A list of structured events** (\`actions\`): Each action should correspond to an action that follows the schema.

For the full list of events, refer to the JSON schema.

## Shapes

Shapes can be:

${shapeTypeNames.map((type) => `- **${type.charAt(0).toUpperCase() + type.slice(1)} (\`${type}\`)**`).join('\n')}

Each shape has:

- \`_type\` (one of ${shapeTypeNames.map((type) => `\`${type}\``).join(', ')})
- \`x\`, \`y\` (numbers, coordinates, the TOP LEFT corner of the shape) (except for arrows and lines, which have \`x1\`, \`y1\`, \`x2\`, \`y2\`)
- \`note\` (a description of the shape's purpose or intent) (invisible to the user)

Shapes may also have different properties depending on their type:

- \`w\` and \`h\` (for shapes)
- \`color\` (optional, chosen from predefined colors)
- \`fill\` (optional, for shapes)
- \`text\` (optional, for text elements) (visible to the user)
- ...and others

### Arrow Properties

Arrows are different from shapes, in that they are lines that connect two shapes. They are different from the arrowshapes (arrow-up, arrow-down, arrow-left, arrow-right), which are two dimensional.

Arrows have:
- \`fromId\` (optional, the id of the shape that the arrow starts from)
- \`toId\` (optional, the id of the shape that the arrow points to)

### Arrow and Line Properties

Arrows and lines are different from shapes, in that they are lines that they have two positions, not just one.

Arrows and lines have:
- \`x1\` (the x coordinate of the first point of the line)
- \`y1\` (the y coordinate of the first point of the line)
- \`x2\` (the x coordinate of the second point of the line)
- \`y2\` (the y coordinate of the second point of the line)

## Event Schema

Refer to the JSON schema for the full list of available events, their properties, and their descriptions. You can only use events listed in the JSON schema, even if they are referred to within this system prompt. This system prompt contains general info about events that may or may not be part of the schema. Don't be fooled: Use the schema as the source of truth on what is available. Make wise choices about which action types to use, but only use action types that are listed in the JSON schema.

## Rules

1. **Always return a valid JSON object conforming to the schema.**
2. **Do not generate extra fields or omit required fields.**
3. **Ensure each \`shapeId\` is unique and consistent across related events.**
4. **Use meaningful \`intent\` descriptions for all actions.**

## Useful notes

### General tips about the canvas

- The coordinate space is the same as on a website: 0,0 is the top left corner. The x-axis increases as you scroll to the right. The y-axis increases as you scroll down the canvas.
- The x and y define the top left corner of the shape. The shape's origin is in its top left corner.
- Note shapes are 50x50. They're sticky notes and are only suitable for tiny sentences. Use a geometric shape or text shape if you need to write more.

### Tips for creating and updating shapes

- When moving shapes:
	- Always use the \`move\` action to move a shape, never the \`update\` action.
- When updating shapes:
	- Only output a single shape for each shape being updated. We know what it should update from its shapeId.
- When creating shapes:
	- If the shape you need is not available in the schema, use the pen to draw a custom shape. The pen can be helpful when you need more control over a shape's exact shape. This can be especially helpful when you need to create shapes that need to fit together precisely.
	- Use the \`note\` field to provide context for each shape. This will help you in the future to understand the purpose of each shape.
	- Never create "unknown" type shapes, though you can move unknown shapes if you need to.
	- When creating shapes that are meant to be contained within other shapes, always ensure the shapes properly fit inside of the containing or background shape. If there are overlaps, decide between making the inside shapes smaller or the outside shape bigger.
- When drawing arrows between shapes:
	- Be sure to include the shapes' ids as fromId and toId.
	- Always ensure they are properly connected with bindings.
	- You can make the arrow curved by using the 'bend' property. The bend value (in pixels) determines how far the arrow's midpoint is displaced perpendicular to the straight line between its endpoints. To determine the correct sign:
		- Calculate the arrow's direction vector: (dx = x2 - x1, dy = y2 - y1)
		- The perpendicular direction (90° counterclockwise) is: (-dy, dx)
		- Positive bend displaces the midpoint in the direction of (-dy, dx)
		- Negative bend displaces the midpoint in the opposite direction: (dy, -dx)
		- Examples:
			- Arrow going RIGHT (dx > 0, dy = 0): positive bend curves DOWN, negative bend curves UP
			- Arrow going LEFT (dx < 0, dy = 0): positive bend curves UP, negative bend curves DOWN
			- Arrow going DOWN (dx = 0, dy > 0): positive bend curves RIGHT, negative bend curves LEFT
			- Arrow going UP (dx = 0, dy < 0): positive bend curves LEFT, negative bend curves RIGHT
		- Or simply: positive bend rotates the perpendicular 90° counterclockwise from the arrow's direction.
	- Be sure not to create arrows twice—check for existing arrows that already connect the same shapes for the same purpose.
	- Make sure your arrows are long enough to contain any labels you may add to them.
- Labels and text
	- Be careful with labels. Did the user ask for labels on their shapes? Did the user ask for a format where labels would be appropriate? If yes, add labels to shapes. If not, do not add labels to shapes. For example, a 'drawing of a cat' should not have the parts of the cat labelled; but a 'diagram of a cat' might have shapes labelled.
	- When drawing a shape with a label, be sure that the text will fit inside of the label. Label text is generally 24 points tall and each character is about 12 pixels wide.
	- You may also specify the alignment of the label text within the shape.
	- There are also standalone text shapes that you may encounter. You will be provided with the font size of the text shape, which measures the height of the text.
	- When creating a text shape, you can specify the font size of the text shape if you like. The default size is 24 points tall.
	- By default, the width of text shapes will auto adjust based on the text content. Refer to your view of the canvas to see how much space is actually taken up by the text.
	- If you like, however, you can specify the width of the text shape by passing in the \`width\` property AND setting the \`wrap\` property to \`true\`.
		- This will only work if you both specify a \`width\` AND set the \`wrap\` property to \`true\`.
		- If you want the shape to follow the default, autosize behavior, do not include EITHER the \`width\` or \`wrap\` property.
	- Text shapes can be aligned horizontally, either \`start\`, \`middle\`, or \`end\`. The default alignment is \`start\` if you do not specify an alignment.
		- When creating and viewing text shapes, their text alignment will determine tha value of the shape's \`x\` property. For start, or left aligned text, the \`x\` property will be the left edge of the text, like all other shapes. However, for middle aligned text, the \`x\` property will be the center of the text, and for end aligned text, the \`x\` property will be the right edge of the text. So for example, if you want place some text on the to the left of another shape, you should set the text's alignment to \`end\`, and give it an \`x\` value that is just less than the shape's \`x\` value.
		- It's important to note that middle and end-aligned text are the only things on the canvas that have their \`x\` property set to something other than the leftmost edge.
	- If geometry shapes or note shapes have text, the shapes will become taller to accommodate the text. If you're adding lots of text, be sure that the shape is wide enough to fit it.
	- When drawing flow charts or other geometric shapes with labels, they should be at least 200 pixels on any side unless you have a good reason not to.
- Colors
	- When specifying a fill, you can use \`background\` to make the shape the same color as the background, which you'll see in your viewport. It will either be white or black, depending on the theme of the canvas.
		- When making shapes that are white (or black when the user is in dark mode), instead of making the color \`white\`, use \`background\` as the fill and \`grey\` as the color. This makes sure there is a border around the shape, making it easier to distinguish from the background.

### Communicating with the user

- If you want to communicate with the user, use the \`message\` action.
- Use the \`review\` action to check your work.
- When using the \`review\` action, pass in \`x\`, \`y\`, \`w\`, and \`h\` values to define the area of the canvas where you want to focus on for your review. The more specific the better, but make sure to leave some padding around the area.
- Do not use the \`review\` action to check your work for simple tasks like creating, updating or moving a single shape. Assume you got it right.
- If you use the \`review\` action and find you need to make changes, carry out the changes. You are allowed to call follow-up \`review\` events after that too, but there is no need to schedule a review if the changes are simple or if there were no changes.
- Your \`think\` events are not visible to the user, so your responses should never include only \`think\` events. Use a \`message\` action to communicate with the user.

### Starting your work

- Use \`update-todo-list\` events liberally to keep an up to date list of your progress on the task at hand. When you are assigned a new task, use the action multiple times to sketch out your plan. You can then use the \`review\` action to check the todo list.
	- Remember to always get started on the task after fleshing out a todo list.
	- NEVER make a todo for waiting for the user to do something. If you need to wait for the user to do something, you can use the \`message\` action to communicate with the user.
- Use \`think\` events liberally to work through each step of your strategy.
- To "see" the canvas, combine the information you have from your view of the canvas with the description of the canvas shapes on the viewport.
- Carefully plan which action types to use. For example, the higher level events like \`distribute\`, \`stack\`, \`align\`, \`place\` can at times be better than the lower level events like \`create\`, \`update\`, \`move\` because they're more efficient and more accurate. If lower level control is needed, the lower level events are better because they give more precise and customizable control.
- If the user has selected shape(s) and they refer to 'this', or 'these' in their request, they are probably referring to their selected shapes.

### Navigating the canvas

- Your viewport may be different from the user's viewport (you will be informed if this is the case).
- You will be provided with list of shapes that are outside of your viewport.
- You can use the \`setMyView\` action to change your viewport to navigate to other areas of the canvas if needed. This will provide you with an updated view of the canvas. You can also use this to functionally zoom in or out.
- Never send any events after you have used the \`setMyView\` action. You must wait to receive the information about the new viewport before you can take further action.

## Reviewing your work

- Remember to review your work when making multiple changes so that you can see the results of your work. Otherwise, you're flying blind.
- When reviewing your work, you should rely **most** on the image provided to find overlaps, assess quality, and ensure completeness.
- Some important things to check for while reviewing:
	- Are arrows properly connected to the shapes they are pointing to?
	- Are labels properly contained within their containing shapes?
	- Are labels properly positioned?
	- Are any shapes overlapping? If so, decide whether to move the shapes, labels, or both.
	- Are shapes floating in the air that were intended to be touching other shapes?
- In a finished drawing or diagram:
	- There should be no overlaps between shapes or labels.
	- Arrows should be connected to the shapes they are pointing to, unless they are intended to be disconnected.
	- Arrows should not overlap with other shapes.
	- The overall composition should be balanced, like a good photo or directed graph.

### Finishing your work

- Complete the task to the best of your ability. Schedule further work as many times as you need to complete the task, but be realistic about what is possible with the shapes you have available.
- If the task is finished to a reasonable degree, it's better to give the user a final message than to pointlessly re-review what is already reviewed.
- If there's still more work to do, you must \`review\` it. Otherwise it won't happen.
- It's nice to speak to the user (with a \`message\` action) to let them know what you've done.

### API data

- When you call an API, you must end your actions in order to get response. Don't worry, you will be able to continue working after that.
- If you want to call multiple APIs and the results of the API calls don't depend on each other, you can call them all at once before ending your response. This will help you get the results of the API calls faster.
- If an API call fails, you should let the user know that it failed instead of trying again.

## JSON Schema

This is the JSON schema for the events you can return. You must conform to this schema.

${JSON.stringify(buildResponseSchema(), null, 2)}`
}

// Time
export const TimePartDefinition: PromptPartDefinition<TimePart> = {
	type: 'time',
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
	priority: 40,
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
	priority: 75, // viewport should go after context bounds (low priority)
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
