import { createContext, ReactNode, useContext } from 'react'
import { useValue } from 'tldraw'
import { $agentsAtom } from './agentsAtom'
import { TldrawAgent } from './TldrawAgent'

const AgentIdContext = createContext<string | null>(null)

/**
 * Provides an agent id to all child components.
 * Components inside this provider can use useAgent() to get the agent.
 *
 * The provider waits until the agent exists in the atom before rendering children,
 * ensuring useAgent() always finds the agent.
 */
export function AgentProvider({ agentId, children }: { agentId: string; children: ReactNode }) {
	const agents = useValue($agentsAtom)
	const agentExists = agents.some((a) => a.id === agentId)

	// Don't render children until agent exists in the atom
	if (!agentExists) return null

	return <AgentIdContext.Provider value={agentId}>{children}</AgentIdContext.Provider>
}

/**
 * Get the agent from context.
 * Must be used inside an AgentProvider - throws if no agent is available.
 *
 * This hook reads from the agents atom, ensuring you always get the current
 * agent reference even if the agent is recreated.
 *
 * @example
 * ```tsx
 * function ChatPanel() {
 *   const agent = useAgent()
 *   // agent is guaranteed to exist here
 *   agent.prompt({ message: 'Draw a snowman' })
 * }
 * ```
 */
export function useAgent(): TldrawAgent {
	const agentId = useContext(AgentIdContext)
	if (!agentId) {
		throw new Error('useAgent must be used inside an AgentProvider')
	}

	const agents = useValue($agentsAtom)
	const agent = agents.find((a) => a.id === agentId)

	if (!agent) {
		throw new Error(`Agent with id "${agentId}" not found`)
	}

	return agent
}
