import { useCallback, useMemo } from 'react'
import { Editor, useToasts, useValue } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'
import { $agentsAtom } from './agentsAtom'

/**
 * Get an agent by id from the agents atom.
 * This hook reads directly from the atom, ensuring you always get the current
 * agent reference.
 *
 * @example
 * ```tsx
 * const agent = useAgent('my-agent')
 * if (agent) {
 *   agent.prompt({ message: 'Draw a snowman' })
 * }
 * ```
 */
export function useAgent(id: string): TldrawAgent | undefined {
	const agents = useValue($agentsAtom)
	return agents.find((a) => a.id === id)
}

/**
 * Create a tldraw agent that can be prompted to edit the canvas.
 * The id is used to differentiate between multiple agents.
 * This starter only creates one agent, but you could create more if you wanted.
 *
 * @example
 * ```tsx
 * const agent = useTldrawAgent(editor)
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 */
export function useTldrawAgent(editor: Editor, id: string = 'tldraw-agent'): TldrawAgent {
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
		// Dispose any existing agent with the same id
		const existingAgent = $agentsAtom.get().find((a) => a.id === id)
		if (existingAgent) {
			existingAgent.dispose()
		}

		// Create a new agent
		return new TldrawAgent({ editor, id, onError: handleError })
	}, [editor, handleError, id])

	return agent
}
