import { useCallback, useMemo, useRef } from 'react'
import { Editor, useToasts } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'

/**
 * Create a tldraw agent that can be prompted to edit the canvas.
 * Optionally provide an id to differentiate between multiple agents.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent(editor)
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 *
 * @example
 * ```tsx
 * const agent1 = useTldrawAgent(editor, 'agent-1')
 * const agent2 = useTldrawAgent(editor, 'agent-2')
 * agent1.prompt({ message: 'Draw a snowman' })
 * agent2.prompt({ message: 'Draw a snowman' })
 * ```
 */
export function useTldrawAgent(editor: Editor, id = 'tldraw-agent'): TldrawAgent {
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

	const agentRef = useRef<TldrawAgent | null>(null)
	const agent = useMemo(() => {
		// Dispose old agent if needed
		if (agentRef.current) {
			console.log('DISPOSING AGENT', id)
			agentRef.current.dispose()
			agentRef.current = null
		}

		// Create new agent
		const _agent = new TldrawAgent({ editor, id, onError: handleError })
		agentRef.current = _agent
		return _agent
	}, [editor, handleError, id])

	return agent
}
