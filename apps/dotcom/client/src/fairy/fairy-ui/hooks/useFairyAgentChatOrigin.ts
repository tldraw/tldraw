import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'

export function useChatOrigin(agent: FairyAgent) {
	return useValue('chat origin', () => agent.chatOrigin.getOrigin(), [agent])
}
