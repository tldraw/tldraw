import { Editor } from 'tldraw'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface MessagePart extends BasePromptPart<'message'> {
	message: string
	requestType: AgentRequest['type']
}

export class MessagePartUtil extends PromptPartUtil<MessagePart> {
	static override type = 'message' as const

	override getPriority() {
		return -Infinity // user message should be last (highest priority)
	}

	override getPart(_editor: Editor, request: AgentRequest): MessagePart {
		return {
			type: 'message',
			message: request.message,
			requestType: request.type,
		}
	}

	override buildContent({ message, requestType }: MessagePart) {
		if (requestType === 'review') {
			return [getReviewPrompt(message)]
		}

		if (requestType === 'setMyView') {
			return [getSetMyViewPrompt(message)]
		}

		if (requestType === 'continue') {
			return [
				'There are still outstanding todo items. Please continue. For your reference, the most recent message I gave you was this:',
				message,
			]
		}

		return [
			"Using the events provided in the response schema, here's what I want you to do:",
			message,
		]
	}
}

function getReviewPrompt(intent: string): string {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Are you awaiting a response from the user? If so, there's no need to do or say anything.
- Is there still more work to do? If so, continue it.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the image, because that's what you can see right now. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.
- Make sure to reference your last actions (denoted by [ACTION]) in order to see if you completed the task. Assume each action you see in the chat history completed successfully.`
}

function getSetMyViewPrompt(intent: string): string {
	return `You have just moved to a new area of the canvas with this goal: "${intent}".
- You probably have some work to do now in the new viewport.
- If your work is done, no need to say anything.
- If you need to adjust your viewport again, do that.`
}
