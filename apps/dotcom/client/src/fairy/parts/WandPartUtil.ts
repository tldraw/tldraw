import { AgentRequest, WandPart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class WandPartUtil extends PromptPartUtil<WandPart> {
	static override type = 'wand' as const

	override getPart(request: AgentRequest): WandPart {
		const { wand } = request
		return {
			type: 'wand',
			wand,
		}
	}
}
