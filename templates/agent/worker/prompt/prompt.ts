import { asMessage } from '@tldraw/ai'
import { CoreMessage, UserContent } from 'ai'
import { AgentHistoryItem } from '../../client/types/AgentHistoryItem'
import { TLAgentPrompt } from '../../client/types/TLAgentPrompt'
import { getSimpleContentFromCanvasContent } from '../simple/getSimpleContentFromCanvasContent'
import { getPeripheralShapesFromCanvasContent } from '../simple/getSimplePeripheralContentFromCanvasContent'

export function buildMessages(prompt: TLAgentPrompt): CoreMessage[] {
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

function buildContextAreasMessages(prompt: TLAgentPrompt): CoreMessage[] {
	const review = prompt.type === 'review'

	const areaContextItems = prompt.contextItems.filter((item) => item.type === 'area')
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

function buildContextPointsMessages(prompt: TLAgentPrompt): CoreMessage[] {
	const pointContextItems = prompt.contextItems.filter((item) => item.type === 'point')
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

function buildContextShapesMessages(prompt: TLAgentPrompt): CoreMessage[] {
	const shapeContextItems = prompt.contextItems.filter((item) => item.type === 'shape')
	const shapesContextItems = prompt.contextItems.filter((item) => item.type === 'shapes')

	const userSelectedShapes = prompt.userSelectedShapes

	const messages: CoreMessage[] = []

	let hasHandledSelectedShapes = false

	// Handle individual shape context items - group them all into one message
	if (shapeContextItems.length > 0) {
		const individualShapes = getSimpleContentFromCanvasContent({
			shapes: shapeContextItems.map((item) => item.shape),
			bindings: [],
		}).shapes

		if (individualShapes.length > 0) {
			const userSelectedShapeIds = new Set(prompt.userSelectedShapes.map((shape) => shape.id))

			const content: UserContent = [
				{
					type: 'text',
					text: `The user has specifically brought your attention to these ${individualShapes.length} shapes individually in this request. Make sure to focus your task on these shapes where applicable:`,
				},
			]

			for (const shape of individualShapes) {
				const isSelected = userSelectedShapeIds.has(shape.shapeId as any)
				if (isSelected) {
					hasHandledSelectedShapes = true
				}
				const shapeText = isSelected
					? `The user has this shape selected: ${JSON.stringify(shape, null, 2)}`
					: JSON.stringify(shape, null, 2)

				content.push({
					type: 'text',
					text: shapeText,
				})
			}

			messages.push({ role: 'user', content })
		}
	}

	// Handle groups of shapes context items - each group gets its own message
	for (const contextItem of shapesContextItems) {
		const shapes = getSimpleContentFromCanvasContent({
			shapes: contextItem.shapes,
			bindings: [],
		}).shapes

		if (shapes.length > 0) {
			// Check if user selection matches exactly with this group of shapes
			const userSelectedShapeIds = new Set(prompt.userSelectedShapes.map((shape) => shape.id))
			const groupShapeIds = new Set(shapes.map((shape) => shape.shapeId))

			const isExactGroupMatch =
				userSelectedShapeIds.size === groupShapeIds.size &&
				Array.from(userSelectedShapeIds).every((id) => groupShapeIds.has(id))

			if (isExactGroupMatch) {
				hasHandledSelectedShapes = true
			}

			const content: UserContent = [
				{
					type: 'text',
					text: isExactGroupMatch
						? `The user has selected this group of ${shapes.length} shapes and brought it to your attention. Focus your task on these specific shapes:`
						: `The user has specifically brought your attention to the following group of ${shapes.length} shapes in this request. Make sure to focus your task on these shapes where applicable:`,
				},
			]

			content.push({
				type: 'text',
				text: shapes.map((shape) => JSON.stringify(shape, null, 2)).join('\n'),
			})

			messages.push({ role: 'user', content })
		}
	}

	if (!hasHandledSelectedShapes && userSelectedShapes.length > 0) {
		const simeUserSelectedShapes = getSimpleContentFromCanvasContent({
			shapes: userSelectedShapes,
			bindings: [],
		}).shapes

		messages.push({
			role: 'user',
			content: [
				{
					type: 'text',
					text:
						'The user has selected these shapes. Focus your task on these shapes where applicable:\n' +
						simeUserSelectedShapes.map((shape) => JSON.stringify(shape, null, 2)).join('\n'),
				},
			],
		})
	}

	return messages
}

function buildHistoryMessages(prompt: TLAgentPrompt): CoreMessage[] {
	const historyItems = prompt.historyItems
	const messages: CoreMessage[] = []

	// If the last message is from the user, skip it
	const lastIndex = historyItems.length - 1
	let end = historyItems.length
	if (end > 0 && historyItems[lastIndex].type === 'prompt') {
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

function buildHistoryItemMessage(item: AgentHistoryItem): CoreMessage | null {
	switch (item.type) {
		case 'prompt': {
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
		case 'event': {
			return {
				role: 'assistant',
				content: [{ type: 'text', text: '[AGENT ACTED]: ' + JSON.stringify(item.event) }],
			}
		}
		case 'change': {
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: '[AGENT CHANGED THE CANVAS]: ' + JSON.stringify(item.event),
					},
				],
			}
		}
		case 'group': {
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: '[AGENT CHANGED THE CANVAS]: ' + JSON.stringify(item.items),
					},
				],
			}
		}
	}
}

/**
 * Build the user messages.
 */
function buildUserMessage(prompt: TLAgentPrompt): CoreMessage {
	const content: UserContent = []

	// Add agent's current viewport
	content.push({
		type: 'text',
		text: `Your current viewport is:\n${JSON.stringify(prompt.contextBounds)}`,
	})

	const currentPageShapes = prompt.currentPageShapes

	// Add the content from the agent's current viewport
	const simplifiedAgentViewportContent = getSimpleContentFromCanvasContent(prompt.canvasContent)

	// Add the content from outside the agent's current viewport
	const peripheralContent = getPeripheralShapesFromCanvasContent(
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
	const currentUserViewportBounds = prompt.currentUserViewportBounds
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
	if (prompt.type === 'review') {
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
	} else if (prompt.type === 'setMyView') {
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
				text: 'Here is a screenshot of your current viewport on the canvas. It is what you can see right at this moment. It is not a reference image.',
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
