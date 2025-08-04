import { asMessage } from '@tldraw/ai'
import { CoreMessage, UserContent } from 'ai'
import {
	ACTION_HISTORY_ITEM_DEFINITIONS,
	ChatHistoryItem,
} from '../../../client/types/ChatHistoryItem'
import { TLAgentSerializedPrompt } from '../../../client/types/TLAgentPrompt'
import { getSimpleContentFromCanvasContent } from '../../simple/getSimpleContentFromCanvasContent'
import { getSimplePeripheralContentFromCanvasContent } from '../../simple/getSimplePeripheralContentFromCanvasContent'

export function buildMessages(prompt: TLAgentSerializedPrompt): CoreMessage[] {
	const messages: CoreMessage[] = []

	const historyMessages = buildHistoryMessages(prompt)
	const contextShapesMessages = buildContextShapesMessages(prompt)
	const contextAreasMessages = buildContextAreasMessages(prompt)
	const contextPointsMessages = buildContextPointsMessages(prompt)
	const userMessage = buildUserMessage(prompt)

	messages.push(...historyMessages)
	messages.push(...contextAreasMessages)
	messages.push(...contextPointsMessages)
	messages.push(...contextShapesMessages)
	messages.push(userMessage)

	return messages
}

function buildContextAreasMessages(prompt: TLAgentSerializedPrompt): CoreMessage[] {
	const review = prompt.meta.type === 'review'

	const areaContextItems = prompt.meta.contextItems.filter((item) => item.type === 'area')
	const areas = areaContextItems.map((item) => item.bounds)
	if (areas.length === 0) {
		return []
	}

	const noReviewPrompt =
		'The user has specifically brought your attention to the following areas in this request. The user might refer to them as the "area(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these areas in both your reasoning and actions. Make sure to focus your task on these areas:'
	const reviewPrompt =
		'You have been instructed to review your work. Here are the areas you should review:'

	const contextAreasText = review ? reviewPrompt : noReviewPrompt

	const content: UserContent = []
	content.push({
		type: 'text',
		text: contextAreasText,
	})

	for (const area of areas) {
		content.push({
			type: 'text',
			text: JSON.stringify(area, null, 2),
		})
	}

	return [{ role: 'user', content }]
}

function buildContextPointsMessages(prompt: TLAgentSerializedPrompt): CoreMessage[] {
	const pointContextItems = prompt.meta.contextItems.filter((item) => item.type === 'point')
	const points = pointContextItems.map((item) => item.point)
	if (points.length === 0) {
		return []
	}

	const content: UserContent = []
	content.push({
		type: 'text',
		text: 'The user has specifically brought your attention to the following points in this request. The user might refer to them as the "point(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these points in both your reasoning and actions. Make sure to focus your task on these points:',
	})

	for (const point of points) {
		content.push({
			type: 'text',
			text: JSON.stringify(point, null, 2),
		})
	}

	return [{ role: 'user', content }]
}

function buildContextShapesMessages(prompt: TLAgentSerializedPrompt): CoreMessage[] {
	const shapeContextItems = prompt.meta.contextItems.filter((item) => item.type === 'shape')
	const shapesContextItems = prompt.meta.contextItems.filter((item) => item.type === 'shapes')

	const allShapesContextItems = [
		...shapeContextItems.map((item) => item.shape),
		...shapesContextItems.flatMap((item) => item.shapes),
	]

	const shapes = getSimpleContentFromCanvasContent({
		shapes: allShapesContextItems,
		bindings: [],
		assets: [],
	}).shapes

	if (shapes.length === 0) {
		return []
	}

	const content: UserContent = []
	content.push({
		type: 'text',
		text: 'The user has specifically brought your attention to the following shapes in this request. Make sure to focus your task on these shapes:',
	})

	for (const shape of shapes) {
		content.push({
			type: 'text',
			text: JSON.stringify(shape, null, 2),
		})
	}

	return [{ role: 'user', content }]
}

function buildHistoryMessages(prompt: TLAgentSerializedPrompt): CoreMessage[] {
	const historyItems = prompt.meta.historyItems
	const messages: CoreMessage[] = []

	// If the last message is from the user, skip it
	const lastIndex = historyItems.length - 1
	let end = historyItems.length
	if (end > 0 && historyItems[lastIndex].type === 'user-message') {
		end = lastIndex
	}

	for (let i = 0; i < end; i++) {
		const item = historyItems[i]
		const message = buildHistoryItemMessage(item)
		if (message) {
			messages.push(message)
		}
	}

	return messages
}

function buildHistoryItemMessage(item: ChatHistoryItem): CoreMessage | null {
	switch (item.type) {
		case 'user-message': {
			const content: UserContent = [
				// { type: 'text', text: 'Previous message from user: ' + item.message },
				{ type: 'text', text: item.message },
			]
			if (item.contextItems.length > 0) {
				for (const contextItem of item.contextItems) {
					switch (contextItem.type) {
						case 'shape': {
							const simpleShape = getSimpleContentFromCanvasContent({
								shapes: [contextItem.shape],
								bindings: [],
								assets: [],
							}).shapes[0]
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(simpleShape, null, 2)}`,
							})
							break
						}
						case 'shapes': {
							const simpleShapes = getSimpleContentFromCanvasContent({
								shapes: contextItem.shapes,
								bindings: [],
								assets: [],
							}).shapes
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(simpleShapes, null, 2)}`,
							})
							break
						}
						default: {
							content.push({
								type: 'text',
								text: `[CONTEXT]: ${JSON.stringify(contextItem, null, 2)}`,
							})
							break
						}
					}
				}
			}
			return {
				role: 'user',
				content,
			}
		}
		// We're filtering out status-thinking from the history items before sending to the models, so they should never see this
		case 'status-thinking': {
			return null
		}
		case 'agent-action': {
			// const text = `Previous action from agent: ${ACTION_HISTORY_ITEM_DEFINITIONS[item.action].message.done}${item.info}`
			const text = `${ACTION_HISTORY_ITEM_DEFINITIONS[item.action].message.done}${item.info}`
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
			}
		}
		case 'agent-message': {
			return {
				role: 'assistant',
				// content: [{ type: 'text', text: 'Previous message from agent: ' + item.message }],
				content: [{ type: 'text', text: item.message }],
			}
		}
		case 'agent-change': {
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: '[ACTION]: ' + JSON.stringify(item.change),
						// text: 'A previous change from agent.',
					},
				],
			}
		}
		case 'agent-change-group': {
			const changes = item.items.map((item) => item.change)
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: '[ACTION]: ' + JSON.stringify(changes),
						// text: 'Previous changes from agent.',
					},
				],
			}
		}
		case 'agent-raw': {
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: '[OUTPUT]: ' + JSON.stringify(item.change),
					},
				],
			}
		}
	}
}

/**
 * Build the user messages.
 */
function buildUserMessage(prompt: TLAgentSerializedPrompt): CoreMessage {
	const content: UserContent = []

	// Add agent's current viewport
	content.push({
		type: 'text',
		text: `Your current viewport is:\n${JSON.stringify(prompt.contextBounds)}`,
	})

	const currentPageShapes = prompt.meta.currentPageShapes

	// Add the content from the agent's current viewport
	const simplifiedAgentViewportContent = getSimpleContentFromCanvasContent(prompt.canvasContent)

	// Add the content from outside the agent's current viewport
	const peripheralContent = getSimplePeripheralContentFromCanvasContent(
		currentPageShapes,
		prompt.canvasContent
	)

	content.push({
		type: 'text',
		text:
			simplifiedAgentViewportContent.shapes.length > 0
				? `Here are the shapes in your current viewport:\n${JSON.stringify(simplifiedAgentViewportContent.shapes).replaceAll('\n', ' ')}`
				: 'Your current viewport is empty.',
	})

	// Add the content from the agent's peripheral vision
	if (peripheralContent.shapes.length > 0) {
		content.push({
			type: 'text',
			text: `Here are the shapes in your peripheral vision, outside the viewport. You can only see their position and size, not their content. If you want to see their content, you need to get closer.\n${JSON.stringify(peripheralContent.shapes)}`,
		})
	}

	// Add the user's viewport bounds if they're more than 5% different from the agent's viewport bounds (maybe a bad heuristic, not sure)
	const currentUserViewportBounds = prompt.meta.currentUserViewportBounds
	const withinPercent = (a: number, b: number, percent: number) => {
		const max = Math.max(Math.abs(a), Math.abs(b), 1)
		return Math.abs(a - b) <= (percent / 100) * max
	}
	const doUserAndAgentShareViewport =
		withinPercent(prompt.contextBounds.x, currentUserViewportBounds.x, 5) &&
		withinPercent(prompt.contextBounds.y, currentUserViewportBounds.y, 5) &&
		withinPercent(prompt.contextBounds.w, currentUserViewportBounds.w, 5) &&
		withinPercent(prompt.contextBounds.h, currentUserViewportBounds.h, 5)

	if (!doUserAndAgentShareViewport) {
		content.push({
			type: 'text',
			text: `The user's viewport is different from the agent's viewport. The user's viewport is:\n${JSON.stringify(currentUserViewportBounds)}`,
		})
	}

	// Add followup messages
	if (prompt.meta.type === 'review') {
		// Review mode
		const messages = asMessage(prompt.message)
		const intent = messages[0]
		if (messages.length !== 1 || intent.type !== 'text') {
			throw new Error('Review message must be a single text message')
		}
		content.push({
			type: 'text',
			text: getReviewPrompt(intent.text),
		})
	} else if (prompt.meta.type === 'setMyView') {
		// Set my view mode
		const messages = asMessage(prompt.message)
		const intent = messages[0]
		if (messages.length !== 1 || intent.type !== 'text') {
			throw new Error('Review message must be a single text message')
		}
		content.push({
			type: 'text',
			text: getSetMyViewPrompt(intent.text),
		})
	} else {
		// Normal mode
		content.push({
			type: 'text',
			text: `Using the events provided in the response schema, here's what I want you to do:`,
		})

		// If it's an array, push each message as a separate message
		for (const message of asMessage(prompt.message)) {
			if (message.type === 'image') {
				content.push({
					type: 'image',
					image: message.src!,
				})
			} else {
				content.push({
					type: 'text',
					text: message.text,
				})
			}
		}
	}

	// Add the screenshot of the agent's current viewport
	if (prompt.image) {
		content.push(
			{
				type: 'text',
				text: 'Here is a screenshot of your current viewport on the canvas. Compare this against the textual description of the canvas. It is not a reference image.', // It's what the user can see.",
			},
			{
				type: 'image',
				image: prompt.image,
			}
		)
	}

	return {
		role: 'user',
		content,
	}
}

function getReviewPrompt(intent: string) {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Are you awaiting a response from the user? If so, there's no need to do or say anything.
- Is there still more work to do? If so, continue it.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the screenshot because that's what the user sees. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.
- Make sure to reference your last actions (denoted by [ACTION]) in order to see if you completed the task. Assume each action you see in the chat history completed successfully.`
}

function getSetMyViewPrompt(intent: string) {
	return `You have just moved to a new area of the canvas with this goal: "${intent}".
    - You probably have some work to do now in the new viewport.
    - If your work is done, no need to say anything.
    - If you need to adjust your viewport again, do that.`
}
