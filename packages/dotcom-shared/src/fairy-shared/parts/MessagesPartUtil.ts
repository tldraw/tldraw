import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface MessagesPart extends BasePromptPart<'messages'> {
	messages: string[]
	requestType: AgentRequest['type']
}

export class MessagesPartUtil extends PromptPartUtil<MessagesPart> {
	static override type = 'messages' as const

	override getPriority() {
		return -Infinity // user message should be last (highest priority)
	}

	override getPart(request: AgentRequest): MessagesPart {
		const { messages, type } = request
		return {
			type: 'messages',
			messages,
			requestType: type,
		}
	}

	override buildContent({ messages, requestType }: MessagesPart) {
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
	}
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
