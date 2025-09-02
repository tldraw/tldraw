import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Editor, useToasts } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'

/**
 * Create a tldraw agent that can be prompted to edit the canvas.
 * Optionally provide a key to differentiate between multiple agents.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent(editor)
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 */
export function useTldrawAgent(editor: Editor, key = 'tldraw-agent'): TldrawAgent {
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
		if (agentRef.current) {
			agentRef.current.dispose()
		}

		const _agent = new TldrawAgent({ editor, key, onError: handleError })
		agentRef.current = _agent
		return _agent
	}, [editor, handleError, key])

	useEffect(() => {
		return () => {
			if (agentRef.current) {
				console.log('DISPOSING AGENT')
				agentRef.current.dispose()
				agentRef.current = null
			}
		}
	}, [])

	return agent
}
