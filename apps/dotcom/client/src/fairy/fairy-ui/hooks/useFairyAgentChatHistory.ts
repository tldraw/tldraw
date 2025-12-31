import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'

export function useChatHistory(agent: FairyAgent) {
	return useValue('chat history', () => agent.chat.getHistory(), [agent])
}
