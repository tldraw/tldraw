import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class MessagePartUtil extends PromptPartUtil<string> {
	static override type = 'message' as const

	override getPriority() {
		return -Infinity // user message should be last (highest priority)
	}

	override async getPart(options: AgentPromptOptions) {
		return options.request.message
	}

	override buildContent(promptPart: string, prompt: AgentPrompt) {
		const requestType = prompt.type

		if (requestType === 'review') {
			// Review mode
			return [getReviewPrompt(promptPart)]
		} else if (requestType === 'setMyView') {
			// Set my view mode
			return [getSetMyViewPrompt(promptPart)]
		} else {
			// Normal mode
			return [
				"Using the events provided in the response schema, here's what I want you to do:",
				promptPart,
			]
		}
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
