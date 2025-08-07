import { useCallback } from 'react'
import { Editor } from 'tldraw'
import { DEFAULT_MODEL_NAME } from '../../worker/models'
import { RoundedCoordinates } from '../transforms/RoundedCoordinates'
import { SimpleText } from '../transforms/SimpleText'
import { UniqueIds } from '../transforms/UniqueIds'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { applyAgentEvent } from './applyAgentEvent'
import { promptAgent } from './promptAgent'

export interface TldrawAgent {
	prompt(options: Partial<TLAgentPromptOptions>): { promise: Promise<void>; cancel(): void }
}

/**
 * Get an agent object with a `prompt` function that has sensible defaults.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent({ editor })
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 *
 * @param options - Options to override the defaults.
 * @returns An object with a `prompt` method.
 */
export function useTldrawAgent({ editor }: { editor: Editor }): TldrawAgent {
	const prompt = useCallback(
		(options: Partial<TLAgentPromptOptions>) => {
			const {
				transforms = [RoundedCoordinates, SimpleText, UniqueIds],
				apply = applyAgentEvent,
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
				transforms,
				apply,
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
		[editor]
	)

	return { prompt }
}
