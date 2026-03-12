import { AgentRequest } from './AgentRequest'

/**
 * A user input, used to form an agent request.
 * This object is more flexible than the AgentRequest object it gets turned into.
 *
 * ```ts
 * const agent = useAgent()
 * agent.prompt('Draw a cat')
 * agent.prompt(['Draw a cat', 'Draw a dog'])
 * agent.prompt({ agentMessages: ['Draw a cat', 'Draw a dog'] })
 * ```
 *
 * The `message` property is a shortcut for providing a single agent message and user message.
 * You can't specify `agentMessages` and `userMessages` when using the `message` property.
 */
export type AgentInput =
	| Partial<AgentRequest>
	| (Partial<Omit<AgentRequest, 'agentMessages' | 'userMessages'>> & { message: string })
	| string
	| string[]
