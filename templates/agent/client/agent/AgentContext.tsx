import { createContext, ReactNode, useContext } from 'react'
import { TldrawAgent } from './TldrawAgent'

const AgentContext = createContext<TldrawAgent | null>(null)

/**
 * Provides an agent to all child components.
 * Components inside this provider can use useRequiredAgent() to get the agent.
 */
export function AgentProvider({ agent, children }: { agent: TldrawAgent; children: ReactNode }) {
	return <AgentContext.Provider value={agent}>{children}</AgentContext.Provider>
}

/**
 * Get the agent from context.
 * Must be used inside an AgentProvider - throws if no agent is available.
 *
 * Use this hook in components that are guaranteed to be rendered with an agent.
 * For components that may render before the agent exists, use useAgent() instead.
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
	const agent = useContext(AgentContext)
	if (!agent) {
		throw new Error('useRequiredAgent must be used inside an AgentProvider')
	}
	return agent
}
