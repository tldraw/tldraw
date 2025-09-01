import { useCallback, useEffect, useMemo } from 'react'
import { Editor, useToasts } from 'tldraw'
import { recordDocumentChanges } from '../atoms/documentChanges'
import { TldrawAgent } from './TldrawAgent'

/**
 * Get an agent object with helpers for prompting
 * *
 * @example
 * ```tsx
 * const agent = useTldrawAgent({ editor })
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 *
 * @returns An object with helpers.
 */
export function useTldrawAgent(editor: Editor): TldrawAgent {
	useEffect(() => recordDocumentChanges(editor), [editor])

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
		return new TldrawAgent(editor, handleError)
	}, [editor, handleError])

	return agent
}
