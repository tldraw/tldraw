import { useCallback, useMemo } from 'react'
import { Editor, useToasts } from 'tldraw'
import { useApp } from '../../../tla/hooks/useAppState'
import { FairyThrowTool } from '../../FairyThrowTool'
import { FairyAgent } from './FairyAgent'
import { $fairyAgentsAtom } from './fairyAgentsAtom'

/**
 * Create a tldraw agent that can be prompted to edit the canvas.
 * The id is used to differentiate between multiple agents.
 * This starter only creates one agent, but you could create more if you wanted.
 *
 * @example
 * ```tsx
 * const agent = useFairyAgent({ fairyConfig, editor, id: 'fairy-agent', getToken })
 * agent.prompt({ message: 'Draw a snowman' })
 * ```
 *
 * @example
 * ```tsx
 * const agent1 = useFairyAgent({ fairyConfig, editor, id: 'agent-1' })
 * const agent2 = useFairyAgent({ fairyConfig, editor, id: 'agent-2' })
 * agent1.prompt({ message: 'Draw a snowman on the left' })
 * agent2.prompt({ message: 'Draw a snowman on the right' })
 * ```
 */
export function useFairyAgent({
	id,
	editor,
	getToken,
}: {
	id: string
	editor: Editor
	getToken(): Promise<string | undefined>
}): FairyAgent {
	const toasts = useToasts()
	const app = useApp()

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
		// Dispose an existing agent
		const existingAgent = $fairyAgentsAtom.get(editor).find((agent) => agent.id === id)
		if (existingAgent) {
			existingAgent.dispose()
		}

		editor.removeTool(FairyThrowTool)
		editor.setTool(FairyThrowTool)

		// Create a new agent
		return new FairyAgent({ id, editor, app, onError: handleError, getToken })
	}, [editor, handleError, id, getToken, app])

	return agent
}
