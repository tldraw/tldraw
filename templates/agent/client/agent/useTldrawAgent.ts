import { useCallback, useEffect, useState } from 'react'
import { Editor, useToasts } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'
import { $agentsAtom } from './agentsAtom'

/**
 * Create a tldraw agent that can be prompted to edit the canvas.
 * The id is used to differentiate between multiple agents.
 * This starter only creates one agent, but you could create more if you wanted.
 *
 * @example
 * ```tsx
 * const agent1 = useTldrawAgent(editor, 'agent-1')
 * const agent2 = useTldrawAgent(editor, 'agent-2')
 * if (!agent1 || !agent2) return
 * agent1.prompt({ message: 'Draw a snowman on the left' })
 * agent2.prompt({ message: 'Draw a snowman on the right' })
 * ```
 */
export function useTldrawAgent(editor: Editor, id: string = 'tldraw-agent'): TldrawAgent | null {
	const toasts = useToasts()
	const [agent, setAgent] = useState<TldrawAgent | null>(null)

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

	useEffect(() => {
		// Dispose any existing agent with the same id
		const existingAgent = $agentsAtom.get().find((a) => a.id === id)
		if (existingAgent) {
			existingAgent.dispose()
		}

		// Create a new agent
		const newAgent = new TldrawAgent({ editor, id, onError: handleError })
		setAgent(newAgent)

		return () => {
			newAgent.dispose()
		}
	}, [editor, handleError, id])

	return agent
}
