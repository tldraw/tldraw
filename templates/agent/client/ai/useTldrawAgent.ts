import { useCallback, useMemo } from 'react'
import { Editor } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { $modelName } from '../atoms/modelName'
import { AgentEventUtil, AgentEventUtilConstructor } from '../events/AgentEventUtil'
import { UnknownEventUtil } from '../events/UnknownEventUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from '../promptParts/PromptPartUitl'
import { ScheduledRequest } from '../types/ScheduledRequest'
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
	prompt(request: ScheduledRequest): { promise: Promise<void>; cancel(): void }

	/**
	 * Get an event util for a specific event type.
	 *
	 * @param type - The type of event to get the util for.
	 * @returns The event util.
	 */
	getEventUtil(type?: string): AgentEventUtil

	/**
	 * Get a prompt part util for a specific prompt part type.
	 *
	 * @param type - The type of part to get the util for.
	 * @returns The part util.
	 */
	getPartUtil<T = any>(type: string): PromptPartUtil<T>
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
	eventUtils: AgentEventUtilConstructor[]
	partUtils: PromptPartUtilConstructor[]
}): TLAgent {
	const eventUtilsMap = useMemo(() => {
		const eventUtilsMap = new Map<IAgentEvent['_type'], AgentEventUtil>()
		for (const eventUtil of eventUtils) {
			eventUtilsMap.set(eventUtil.type, new eventUtil(editor))
		}
		return eventUtilsMap
	}, [editor, eventUtils])

	const unknownEventUtil = useMemo(() => {
		return new UnknownEventUtil(editor)
	}, [editor])

	const getEventUtil = useCallback(
		(type?: string) => {
			const eventUtil = eventUtilsMap.get(type as IAgentEvent['_type'])
			if (!eventUtil) {
				return unknownEventUtil
			}
			return eventUtil
		},
		[eventUtilsMap, unknownEventUtil]
	)

	const promptPartsUtilsMap = useMemo(() => {
		const promptPartsUtilsMap = new Map<PromptPartUtilConstructor['type'], PromptPartUtil>()
		for (const promptPartUtil of partUtils) {
			promptPartsUtilsMap.set(promptPartUtil.type, new promptPartUtil(editor))
		}
		return promptPartsUtilsMap
	}, [editor, partUtils])

	const getPartUtil = useCallback(
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
			contextItems = [],
			bounds = editor.getViewportPageBounds(),
			type = 'user',
		}: Partial<ScheduledRequest>) => {
			return promptAgent({
				editor,
				eventUtils: eventUtilsMap,
				promptPartUtils: promptPartsUtilsMap,
				modelName: $modelName.get(),
				request: {
					type,
					message,
					bounds,
					contextItems,
				},
			})
		},
		[editor, eventUtilsMap, promptPartsUtilsMap]
	)

	return { prompt, getEventUtil, getPartUtil }
}
