import { useCallback, useEffect, useMemo } from 'react'
import { Editor, useToasts } from 'tldraw'
import { AgentActionUtil } from '../../shared/actions/AgentActionUtil'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { recordDocumentChanges } from '../atoms/documentChanges'
import { $modelName } from '../atoms/modelName'
import { promptAgent } from './promptAgent'

/**
 * An object with helpers for getting an AI agent to edit the canvas.
 */
export interface TLAgent {
	/**
	 * Prompt the agent to edit the canvas.
	 *
	 * @example
	 * ```tsx
	 * const agent = useTldrawAgent({ editor })
	 * agent.prompt({ message: 'Draw a snowman' })
	 * ```
	 *
	 * @param request - The request to prompt the agent with.
	 * @returns A promise that resolves when the agent has finished editing the canvas.
	 */
	prompt(request: AgentRequest): { promise: Promise<void>; cancel(): void }

	/**
	 * Get an agent action util for a specific action type.
	 *
	 * @param type - The type of action to get the util for.
	 * @returns The action util.
	 */
	getAgentActionUtil(type?: string): AgentActionUtil<AgentAction>
}

/**
 * Get an agent object with helpers for prompting
 * *
 * @example
 * ```tsx
 * const agent = useTldrawAgent({ editor })
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 *
 * @returns An object with helpers.
 */
export function useTldrawAgent(editor: Editor): TLAgent {
	const agentActionUtilsRecord = useMemo(() => getAgentActionUtilsRecord(), [])
	const promptPartsUtilsRecord = useMemo(() => getPromptPartUtilsRecord(), [])
	const unknownActionUtil = agentActionUtilsRecord.unknown

	useEffect(() => {
		const cleanUp = recordDocumentChanges(editor)
		return () => cleanUp()
	}, [editor])

	const getAgentActionUtil = useCallback(
		(type?: string) => {
			if (!type) return unknownActionUtil
			const actionUtil = agentActionUtilsRecord[type as AgentAction['_type']]
			if (!actionUtil) return unknownActionUtil
			return actionUtil
		},
		[agentActionUtilsRecord, unknownActionUtil]
	)

	const toasts = useToasts()
	const handleError = useCallback(
		(e: any) => {
			const message = typeof e === 'string' ? e : e instanceof Error && e.message
			toasts.addToast({
				title: 'Error',
				description: message || 'An error occurred',
				severity: 'error',
			})
			console.error(e)
		},
		[toasts]
	)

	const prompt = useCallback(
		({
			message = '',
			bounds = editor.getViewportPageBounds(),
			contextItems = [],
			modelName = $modelName.get(),
			type = 'user',
		}: Partial<AgentRequest>) => {
			return promptAgent({
				editor,
				promptPartUtils: promptPartsUtilsRecord,
				agentActionsUtils: agentActionUtilsRecord,
				request: {
					message,
					bounds,
					modelName,
					contextItems,
					type,
				},
				onError: handleError,
			})
		},
		[editor, handleError, agentActionUtilsRecord, promptPartsUtilsRecord]
	)

	return { prompt, getAgentActionUtil }
}
