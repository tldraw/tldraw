import { useCallback, useMemo } from 'react'
import { Editor, useToasts, useValue } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'
import { $agentsAtom } from './agentsAtom'

/**
 * Create a tldraw agent that can be prompted to edit the canvas.
 * Provide an id to differentiate between multiple agents on the same editor.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent(editor, 'my-agent')
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
export function useTldrawAgent(editor: Editor, id: string): TldrawAgent {
	const toasts = useToasts()
	const agents = useValue('agents', () => $agentsAtom.get(editor), [editor])

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
		const existingAgent = agents.find((agent) => agent.id === id)
		if (existingAgent) {
			// Use the existing agent
			if (!existingAgent.disposed) {
				return existingAgent
			}

			// Remove a disposed agent
			$agentsAtom.update(editor, (agents) => agents.filter((agent) => agent.id !== id))
		}

		// Create a new agent
		console.log('CREATING AGENT', id)
		const newAgent = new TldrawAgent({ editor, id, onError: handleError })
		$agentsAtom.update(editor, (agents) => [...agents, newAgent])
		return newAgent
	}, [editor, agents, id, handleError])

	return agent
}
