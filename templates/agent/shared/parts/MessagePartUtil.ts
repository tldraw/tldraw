import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface MessagePart extends BasePromptPart<'message'> {
	message: string
	requestType: AgentRequest['type']
	apiData?: AgentRequest['apiData']
}

export class MessagePartUtil extends PromptPartUtil<MessagePart> {
	static override type = 'message' as const

	override getPriority() {
		return -Infinity // user message should be last (highest priority)
	}

	override getPart(request: AgentRequest): MessagePart {
		const { message, type, apiData } = request
		return {
			type: 'message',
			message,
			requestType: type,
			apiData,
		}
	}

	override buildContent({ message, requestType, apiData }: MessagePart) {
		let responsePart: string[] = []

		switch (requestType) {
			case 'user':
				responsePart = getUserPrompt(message)
				break
			case 'schedule':
				responsePart = getSchedulePrompt(message)
				break
			case 'todo':
				responsePart = getTodoPrompt(message)
				break

			// Handle the custom "review" request type
			case 'review':
				responsePart = [getReviewPrompt(message)]
				break
		}

		// Feels weird to handle sending the api data to the model in just a MessagePartUtil. Probably worth putting in some time to to make a "api request response" part util.
		const apiDataFormatted = Object.entries(apiData ?? {}).map(([actionType, data]) => {
			if (Array.isArray(data)) {
				return `${actionType}: ${data.length} result(s) - ${JSON.stringify(data)}`
			} else {
				return `${actionType}: ${JSON.stringify(data)}`
			}
		})

		if (apiDataFormatted.length > 0) {
			responsePart.push(`Here's the API data you requested: ${apiDataFormatted.join('\n')}`)
		}

		return responsePart
	}
}

function getUserPrompt(intent: string) {
	return [`Using the events provided in the response schema, here's what I want you to do:`, intent]
}

function getReviewPrompt(intent: string) {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Are you awaiting a response from the user? If so, there's no need to do or say anything.
- Is there still more work to do? If so, continue it.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the image, because that's what you can see right now. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.
- Make sure to reference your last actions (denoted by [ACTION]) in order to see if you completed the task. Assume each action you see in the chat history completed successfully.`
}

function getSchedulePrompt(intent: string) {
	return [
		`You have scheduled some work in this area of the canvas with this goal: "${intent}".
- You probably have some work to do now in this area.
- If your work is done, no need to say anything.
- If you need to adjust your viewport, do that.`,
	]
}

function getTodoPrompt(intent: string) {
	return [
		`There are still outstanding todo items. Please continue. For your reference, the most recent message I gave you was this:`,
		intent,
	]
}
