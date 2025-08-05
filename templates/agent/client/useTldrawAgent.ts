import { useCallback } from 'react'
import { Editor } from 'tldraw'
import { DEFAULT_MODEL_NAME } from '../worker/models'
import { promptAgent } from './promptAgent'
import { RoundedCoordinates } from './transforms/RoundedCoordinates'
import { SimpleText } from './transforms/SimpleText'
import { UniqueIds } from './transforms/UniqueIds'
import { TLAgentPromptOptions } from './types/TLAgentPrompt'

export interface TldrawAgent {
	prompt(options: Partial<TLAgentPromptOptions>): { promise: Promise<void>; cancel(): void }
}

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
