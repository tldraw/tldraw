import { useCallback, useMemo } from 'react'
import { Editor, useToasts } from 'tldraw'
import { AgentActionUtil, AgentActionUtilConstructor } from '../../shared/actions/AgentActionUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from '../../shared/parts/PromptPartUtil'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentRequest } from '../../shared/types/AgentRequest'
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
	getAgentActionUtil(type?: string): AgentActionUtil

	/**
	 * Get a prompt part util for a specific prompt part type.
	 *
	 * @param type - The type of part to get the util for.
	 * @returns The part util.
	 */
	getPromptPartUtil<T = any>(type: string): PromptPartUtil<T>
}

/**
 * Get an object with helpers for getting an AI agent to edit the canvas.
 *
 * Pass it an array of part utils to determine what gets sent to the agent.
 * Pass it an array of event utils to decide how to handle the events that the agent returns.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent({ editor })
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 *
 * @returns An object with helpers.
 */
export function useTldrawAgent({
	editor,
	partUtils = [],
	eventUtils = [],
}: {
	editor: Editor
	eventUtils: AgentActionUtilConstructor<AgentAction>[]
	partUtils: PromptPartUtilConstructor[]
}): TLAgent {
	const agentActionUtilsMap = useMemo(() => {
		const map = new Map<AgentAction['_type'], AgentActionUtil<AgentAction>>()
		for (const eventUtil of eventUtils) {
			map.set(eventUtil.type, new eventUtil())
		}
		return map
	}, [eventUtils])

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

	const unknownActionUtil = useMemo(() => {
		const util = agentActionUtilsMap.get('unknown')
		if (!util) {
			throw new Error(
				'An "unknown" agent action util must be provided so that the agent can handle unidentified actions.'
			)
		}
		return util
	}, [agentActionUtilsMap])

	const getAgentActionUtil = useCallback(
		(type: AgentAction['_type']) => {
			const actionUtil = agentActionUtilsMap.get(type)
			if (!actionUtil) {
				return unknownActionUtil
			}
			return actionUtil
		},
		[agentActionUtilsMap, unknownActionUtil]
	)

	const promptPartsUtilsMap = useMemo(() => {
		const promptPartsUtilsMap = new Map<PromptPartUtilConstructor['type'], PromptPartUtil>()
		for (const promptPartUtil of partUtils) {
			promptPartsUtilsMap.set(promptPartUtil.type, new promptPartUtil())
		}
		return promptPartsUtilsMap
	}, [partUtils])

	const getPromptPartUtil = useCallback(
		(type: string) => {
			const promptPartUtil = promptPartsUtilsMap.get(type as PromptPartUtilConstructor['type'])
			if (!promptPartUtil) {
				//these are defined by the developer and so shouldn't result in an unknown type
				throw new Error(`Prompt part util not found for type: ${type}`)
			}
			return promptPartUtil
		},
		[promptPartsUtilsMap]
	)

	const prompt = useCallback(
		({
			message = '',
			bounds = editor.getViewportPageBounds(),
			contextItems = [],
			modelName = $modelName.get(),
		}: Partial<AgentRequest>) => {
			return promptAgent(
				{
					editor,
					agentActionUtils: agentActionUtilsMap,
					promptPartUtils: promptPartsUtilsMap,
					request: {
						message,
						bounds,
						modelName,
						contextItems,
					},
				},
				handleError
			)
		},
		[editor, agentActionUtilsMap, promptPartsUtilsMap, handleError]
	)

	return { prompt, getAgentActionUtil, getPromptPartUtil }
}
