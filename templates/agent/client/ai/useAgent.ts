import { useCallback, useMemo } from 'react'
import { Editor, structuredClone } from 'tldraw'
import { DEFAULT_MODEL_NAME } from '../../worker/models'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentEventUtil, AgentEventUtilConstructor } from '../events/AgentEventUtil'
import { UnknownEventUtil } from '../events/UnknownEventUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from '../promptParts/PromptPartUitl'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { promptAgent } from './promptAgent'
import { getWholePageContent } from './promptConstruction/getWholePageContent'

export interface TLAgent {
	prompt(options: Partial<TLAgentPromptOptions>): { promise: Promise<void>; cancel(): void }
	getEventUtil(type?: string): AgentEventUtil
	getPromptPartUtil(type: string): PromptPartUtil
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
				//these are defined by the developer and so shouldn't ever result in an unknown type
				throw new Error(`Prompt part util not found for type: ${type}`)
			}
			return promptPartUtil
		},
		[promptPartsUtilsMap]
	)

	const prompt = useCallback(
		(options: Partial<TLAgentPromptOptions>) => {
			const {
				message = '',
				contextBounds = editor.getViewportPageBounds(),
				promptBounds = editor.getViewportPageBounds(),
				modelName = DEFAULT_MODEL_NAME,
				historyItems = [],
				contextItems = [],
				currentPageContent = getWholePageContent({ editor }),
				currentUserViewportBounds = editor.getViewportPageBounds(),
				userSelectedShapeIds = editor.getSelectedShapeIds().map((v) => structuredClone(v)) ?? [],
				type = 'user',
			} = options

			return promptAgent({
				editor: options.editor ?? editor,
				eventUtils: eventUtilsMap,
				promptPartUtils: promptPartsUtilsMap,
				message,
				contextBounds,
				promptBounds,
				modelName,
				historyItems,
				contextItems,
				currentPageContent,
				currentUserViewportBounds,
				userSelectedShapeIds,
				type,
			})
		},
		[editor, eventUtilsMap, promptPartsUtilsMap]
	)

	return { prompt, getEventUtil, getPromptPartUtil }
}
