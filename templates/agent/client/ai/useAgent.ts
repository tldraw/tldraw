import { useCallback, useMemo } from 'react'
import { Editor } from 'tldraw'
import { DEFAULT_MODEL_NAME } from '../../worker/models'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentEventUtil, AgentEventUtilConstructor } from '../events/AgentEventUtil'
import { UnknownEventUtil } from '../events/UnknownEventUtil'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { promptAgent } from './promptAgent'

export interface TLAgent {
	prompt(options: Partial<TLAgentPromptOptions>): { promise: Promise<void>; cancel(): void }
	getEventUtil(type?: string): AgentEventUtil
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
}: {
	editor: Editor
	eventUtils: AgentEventUtilConstructor[]
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

	const prompt = useCallback(
		(options: Partial<TLAgentPromptOptions>) => {
			const {
				message = '',
				contextBounds = editor.getViewportPageBounds(),
				promptBounds = editor.getViewportPageBounds(),
				modelName = DEFAULT_MODEL_NAME,
				historyItems = [],
				contextItems = [],
				currentPageShapes = editor.getCurrentPageShapesSorted(),
				currentUserViewportBounds = editor.getViewportPageBounds(),
				userSelectedShapes = editor.getSelectedShapes(),
				type = 'user',
			} = options

			return promptAgent({
				editor: options.editor ?? editor,
				eventUtils: eventUtilsMap,
				message,
				contextBounds,
				promptBounds,
				modelName,
				historyItems,
				contextItems,
				currentPageShapes,
				currentUserViewportBounds,
				userSelectedShapes,
				type,
			})
		},
		[editor, eventUtilsMap]
	)

	return { prompt, getEventUtil }
}
