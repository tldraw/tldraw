import { useCallback } from 'react'
import { Editor } from 'tldraw'
import { DEFAULT_MODEL_NAME } from '../../worker/models'
import { RoundedCoordinates } from '../transforms/RoundedCoordinates'
import { SimpleText } from '../transforms/SimpleText'
import { UniqueIds } from '../transforms/UniqueIds'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
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
			return promptAgent({
				editor: options.editor ?? editor,
				transforms: options.transforms ?? [RoundedCoordinates, SimpleText, UniqueIds],
				message: options.message ?? '',
				contextBounds: options.contextBounds ?? editor.getViewportPageBounds(),
				promptBounds: options.promptBounds ?? editor.getViewportPageBounds(),
				meta: options.meta ?? {
					modelName: DEFAULT_MODEL_NAME,
					historyItems: [],
					contextItems: [],
					currentPageShapes: editor.getCurrentPageShapesSorted(),
					currentUserViewportBounds: editor.getViewportPageBounds(),
					userSelectedShapes: editor.getSelectedShapes(),
					type: 'user',
				},
			})
		},
		[editor]
	)

	return { prompt }
}
