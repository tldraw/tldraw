import { BoxModel, JsonValue } from 'tldraw'
import { ContextItem } from './ContextItem'

/**
 * A request that we send to the agent.
 */
export interface AgentRequest {
	/**
	 * Messages associated with the request.
	 * These are the agent-facing messages that will be sent to the model.
	 */
	agentMessages: string[]

	/**
	 * Optional user-facing messages that will be displayed in the UI.
	 * Each index corresponds to the same index in the `agentMessages` array.
	 * If a user-facing message is not provided for a particular message (null),
	 * the UI may fall back to displaying the agent-facing message.
	 * If this array is shorter than `agentMessages`, missing entries are treated as null.
	 */
	userMessages: string[]

	/**
	 * The bounds of the request.
	 */
	bounds: BoxModel

	/**
	 * Any extra data that has been retrieved as part of this request.
	 * All promises in this array will be resolved before the request is sent.
	 */
	data: (JsonValue | Promise<JsonValue>)[]

	/**
	 * Where the request came from.
	 * - 'user' is a request from the user.
	 * - 'self' is a request from the agent itself.
	 * - 'other-agent' is a request from another agent.
	 */
	source: 'user' | 'self' | 'other-agent'

	/**
	 * Context items that were active when this request was created.
	 * This is a snapshot of the context at request creation time.
	 */
	contextItems: ContextItem[]
}

export type AgentRequestSource = AgentRequest['source']
