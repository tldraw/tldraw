import { Editor } from 'tldraw'
import { AgentActionUtil } from '../../shared/actions/AgentActionUtil'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { PromptPartUtil } from '../../shared/parts/PromptPartUtil'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPart } from '../../shared/types/PromptPart'
import { $modelName } from '../atoms/modelName'
import { promptAgent } from './promptAgent'

export class TldrawAgent {
	private agentActionUtilsRecord: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	private promptPartsUtilsRecord: Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	private unknownActionUtil: AgentActionUtil<AgentAction>

	constructor(
		public editor: Editor,
		public onError: (e: any) => void
	) {
		this.agentActionUtilsRecord = getAgentActionUtilsRecord()
		this.promptPartsUtilsRecord = getPromptPartUtilsRecord()
		this.unknownActionUtil = this.agentActionUtilsRecord.unknown
	}

	/**
	 * Get an agent action util for a specific action type.
	 *
	 * @param type - The type of action to get the util for.
	 * @returns The action util.
	 */
	getAgentActionUtil(type?: string) {
		if (!type) return this.unknownActionUtil
		const util = this.agentActionUtilsRecord[type as AgentAction['_type']]
		if (!util) return this.unknownActionUtil
		return util
	}

	/**
	 * Get a prompt part util for a specific part type.
	 *
	 * @param type - The type of part to get the util for.
	 * @returns The part util.
	 */
	getPromptPartUtil(type: PromptPart['type']) {
		return this.promptPartsUtilsRecord[type]
	}

	/**
	 * Prompt the agent to edit the canvas.
	 *
	 * @example
	 * ```tsx
	 * const agent = useTldrawAgent({ editor })
	 * agent.prompt({ message: 'Draw a snowman' })
	 * ```
	 *
	 * @returns A promise that resolves when the agent has finished editing the canvas.
	 */
	prompt({
		message = '',
		bounds = this.editor.getViewportPageBounds(),
		contextItems = [],
		modelName = $modelName.get(),
		type = 'user',
	}: Partial<AgentRequest>) {
		return promptAgent({
			agent: this,
			agentActionsUtils: this.agentActionUtilsRecord,
			promptPartUtils: this.promptPartsUtilsRecord,
			request: {
				message,
				bounds,
				contextItems,
				modelName,
				type,
			},
			onError: this.onError,
		})
	}
}
