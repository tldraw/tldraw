import { useCallback, useMemo } from 'react'
import { Editor } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { $modelName } from '../atoms/modelName'
import { AgentEventUtil, AgentEventUtilConstructor } from '../events/AgentEventUtil'
import { UnknownEventUtil } from '../events/UnknownEventUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from '../promptParts/PromptPartUitl'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { promptAgent } from './promptAgent'

export interface TLAgent {
	prompt(request: ScheduledRequest): { promise: Promise<void>; cancel(): void }
	getEventUtil(type?: string): AgentEventUtil
	getPromptPartUtil<T = any>(type: string): PromptPartUtil<T>
}

/**
 * Get an agent object with helpers for interacting with an AI agent that can edit the canvas.
 *
 * @example
 * ```tsx
 * const agent = useAgent({ editor })
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 *
 * @param options - Options to override the defaults.
 * @returns An object with helpers.
 */
export function useAgent({
	editor,
	eventUtils = [],
	promptPartUtils = [],
}: {
	editor: Editor
	eventUtils: AgentEventUtilConstructor[]
	promptPartUtils: PromptPartUtilConstructor[]
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
		for (const promptPartUtil of promptPartUtils) {
			promptPartsUtilsMap.set(promptPartUtil.type, new promptPartUtil(editor))
		}
		return promptPartsUtilsMap
	}, [editor, promptPartUtils])

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

	return { prompt, getEventUtil, getPromptPartUtil }
}
