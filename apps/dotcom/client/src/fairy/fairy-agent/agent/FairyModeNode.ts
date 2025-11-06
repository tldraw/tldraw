import { FairyModeDefinition } from '@tldraw/fairy-shared'
import { FairyAgent } from './FairyAgent'

export interface FairyModeNode {
	onPromptStart?(agent: FairyAgent): void | Promise<void>
	onPromptEnd?(agent: FairyAgent): void | Promise<void>
	onRequestComplete?(agent: FairyAgent): void | Promise<void>
}

export const FAIRY_MODE_CHART: Record<FairyModeDefinition['type'], FairyModeNode> = {
	idling: {
		onPromptStart(agent) {
			agent.setMode('soloing')
		},
	},
	soloing: {
		onPromptEnd(agent) {
			agent.setMode('idling')
		},
		onRequestComplete(agent) {
			agent.schedule('Whats the meaning of life?')
		},
	},
	working: {},
	['standing-by']: {},
	orchestrating: {},
}
