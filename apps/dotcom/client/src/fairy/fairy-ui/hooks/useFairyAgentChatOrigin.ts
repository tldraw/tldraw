import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'

export function useChatOrigin(agent: FairyAgent) {
	return useValue('chat origin', () => agent.chatOriginManager.getOrigin(), [agent])
}
