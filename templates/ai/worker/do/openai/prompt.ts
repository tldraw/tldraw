import { TLAiSerializedPrompt, asMessage } from '@tldraw/ai'
import {
	ResponseInputItem,
	ResponseInputMessageContentList,
} from 'openai/resources/responses/responses'
import { getSimpleContentFromCanvasContent } from './getSimpleContentFromCanvasContent'

/**
 * Build the messages for the prompt.
 */
export function buildPromptMessages(prompt: TLAiSerializedPrompt): ResponseInputItem[] {
	const developerMessage = buildDeveloperMessage(prompt)
	const userMessage = buildUserMessage(prompt)

	return [developerMessage, userMessage]
}

function buildDeveloperMessage(prompt: TLAiSerializedPrompt): ResponseInputItem {
	const developerMessage: ResponseInputItem & {
		content: ResponseInputMessageContentList
	} = {
		role: 'developer',
		content: [],
	}

	developerMessage.content.push({
		type: 'input_text',
		text: `The user's current viewport is: { x: ${prompt.promptBounds.x}, y: ${prompt.promptBounds.y}, width: ${prompt.promptBounds.w}, height: ${prompt.promptBounds.h} }`,
	})

	if (prompt.canvasContent) {
		const simplifiedCanvasContent = getSimpleContentFromCanvasContent(prompt.canvasContent)

		developerMessage.content.push({
			type: 'input_text',
			text: `Here are all of the shapes that are in the user's current viewport:\n\n${JSON.stringify(simplifiedCanvasContent.shapes).replaceAll('\n', ' ')}`,
		})
	}

	return developerMessage
}

/**
 * Build the user message.
 */
function buildUserMessage(prompt: TLAiSerializedPrompt): ResponseInputItem {
	const userMessage: ResponseInputItem & {
		content: ResponseInputMessageContentList
	} = {
		role: 'user',
		content: [],
	}

	if (prompt.image) {
		userMessage.content.push(
			{
				type: 'input_image',
				detail: 'auto',
				image_url: prompt.image,
			},
			{
				type: 'input_text',
				text: 'Here is a screenshot of the my current viewport.',
			}
		)
	}

	// If it's an array, push each message as a separate message
	userMessage.content.push({
		type: 'input_text',
		text: `Using the events provided in the response schema, here's what I want you to do:`,
	})

	for (const message of asMessage(prompt.message)) {
		if (message.type === 'image') {
			userMessage.content.push({
				type: 'input_image',
				detail: 'auto',
				image_url: message.src!,
			})
		} else {
			userMessage.content.push({
				type: 'input_text',
				text: message.text,
			})
		}
	}

	return userMessage
}
