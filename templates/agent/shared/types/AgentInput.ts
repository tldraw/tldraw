import { AgentRequest } from './AgentRequest'

/**
 * A user input, used to form an agent request.
 * This object is more flexible than the AgentRequest object it gets turned into.
 *
 * ```ts
 * const agent = useTldrawAgent(editor)
 * agent.prompt('Draw a cat')
 * agent.prompt(['Draw a cat', 'Draw a dog'])
 * agent.prompt({ message: 'Draw a cat' })
 * agent.prompt({ messages: ['Draw a cat', 'Draw a dog'] })
 * ```
 */
export type AgentInput = Partial<AgentRequest & { message: string }> | string | string[]
