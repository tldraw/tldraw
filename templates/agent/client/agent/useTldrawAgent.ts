import { useCallback, useEffect, useMemo } from 'react'
import { Editor, useToasts } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'

/**
 * Create a tldraw agent that can be prompted to edit the canvas.
 * *
 * @example
 * ```tsx
 * const agent = useTldrawAgent(editor)
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 */
export function useTldrawAgent(editor: Editor): TldrawAgent {
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

	const agent = useMemo(() => {
		return new TldrawAgent({
			editor,
			persistenceKey: 'agent',
			onError: handleError,
		})
	}, [editor, handleError])

	useEffect(() => {
		return agent.startRecordingDocumentChanges()
	}, [agent])

	return agent
}
