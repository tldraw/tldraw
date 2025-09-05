import { AgentRequest } from './AgentRequest'

/**
 * A user input, used to form an agent request.
 *
 * If a string is provided, it will be used as a message.
 */
export type AgentInput = Partial<AgentRequest> | string
