import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'

export function useChatHistory(agent: FairyAgent) {
	return useValue('chat history', () => agent.chatManager.getHistory(), [agent])
}
