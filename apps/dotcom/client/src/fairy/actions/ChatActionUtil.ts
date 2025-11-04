import {
	ChatAction,
	FAIRY_SHOUTING_DIMENSIONS,
	ProximityChatMessage,
	Streaming,
} from '@tldraw/fairy-shared'
import { Box, Editor } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyAgents, getFairyNameById } from '../fairy-agent/agent/fairyAgentsAtom'
import { AgentActionUtil } from './AgentActionUtil'

export class ChatActionUtil extends AgentActionUtil<ChatAction> {
	static override type = 'proximity-chat' as const

	override getInfo(action: Streaming<ChatAction>) {
		return {
			icon: 'pencil' as const,
			description: action.complete
				? `Sent: ${action.text}`
				: 'Sending a chat message to nearby fairies...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<ChatAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const senderPosition = this.agent.$fairyEntity.get().position
		const senderName = getFairyNameById(this.agent.id, this.editor) ?? this.agent.id

		const message: ProximityChatMessage = {
			senderId: this.agent.id,
			message: action.text,
			timestamp: Date.now(),
			response_requested: action.response_requested,
		}

		// console.log('message from ', senderName, ':', message.message)

		// Find all nearby fairies within the shouting box
		const shoutingBox = Box.FromCenter(senderPosition, FAIRY_SHOUTING_DIMENSIONS)
		const allFairies = getFairyAgents(this.editor)
		const fairiesWithinShoutingDistance = allFairies.filter((fairy) => {
			if (fairy.id === this.agent.id) return false // Don't send to self

			const fairyPosition = fairy.$fairyEntity.get().position
			return Box.ContainsPoint(shoutingBox, fairyPosition)
		})

		if (fairiesWithinShoutingDistance.length === 0) {
			// No nearby fairies to send message to
			this.agent.schedule({
				messages: ['You tried to send a chat message, but there are no other fairies nearby.'],
			})
			return
		}

		const mentionedFairyIds = getMentionedFairyIds(action.text, this.editor)

		// Send the message to all nearby fairies, tagging the ones that were mentioned
		fairiesWithinShoutingDistance.forEach((fairy) => {
			fairy.addHeardMessage(message)
			if (mentionedFairyIds.includes(fairy.id)) {
				fairy.prompt({
					type: 'schedule',
					messages: [
						`📣 Mentioned by: ${senderName} (id: ${this.agent.id}) in a message! You can choose to respond to the message, or ignore it.`,
					],
				})
			}
		})
	}
}

/**
 * Checks if a string contains @ mentions of any existing fairy IDs.
 * @param text The text to search for mentions
 * @param editor The editor instance to get fairy agents from
 * @returns A list of fairy IDs that were mentioned in the text
 */
function getMentionedFairyIds(text: string, editor: Editor): string[] {
	// Match @ mentions - @ followed by word characters (alphanumeric, underscore, hyphen)
	const mentionPattern = /@([a-zA-Z0-9_-]+)/g
	const mentions: string[] = []
	let match: RegExpExecArray | null

	while ((match = mentionPattern.exec(text)) !== null) {
		mentions.push(match[1])
	}

	// Get all existing fairy IDs
	const allFairies = getFairyAgents(editor)
	const fairyIds = new Set(allFairies.map((fairy) => fairy.id))

	// Return only the mentions that match existing fairy IDs
	return mentions.filter((mention) => fairyIds.has(mention))
}
