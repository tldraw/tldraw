import { useCallback } from 'react'
import { Editor } from 'tldraw'
import { DEFAULT_MODEL_NAME } from '../../worker/models'
import { AlignEventHandler } from '../events/AlignEventHandler'
import { CreateEventHandler } from '../events/CreateEventHandler'
import { DeleteEventHandler } from '../events/DeleteEventHandler'
import { DistributeEventHandler } from '../events/DistributeEventHandler'
import { LabelEventHandler } from '../events/LabelEventHandler'
import { MoveEventHandler } from '../events/MoveEventHandler'
import { PlaceEventHandler } from '../events/PlaceEventHandler'
import { ReviewEventHandler } from '../events/ReviewEventHandler'
import { SetMyViewEventHandler } from '../events/SetMyViewEventHandler'
import { StackEventHandler } from '../events/StackEventHandler'
import { UpdateEventHandler } from '../events/UpdateEventHandler'
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
				events: [
					AlignEventHandler,
					CreateEventHandler,
					DeleteEventHandler,
					DistributeEventHandler,
					LabelEventHandler,
					MoveEventHandler,
					PlaceEventHandler,
					ReviewEventHandler,
					SetMyViewEventHandler,
					StackEventHandler,
					UpdateEventHandler,
				],
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
