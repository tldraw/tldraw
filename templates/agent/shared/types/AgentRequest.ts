import { BoxModel, JsonValue } from 'tldraw'

/**
 * A request that we send to the agent.
 */
export interface AgentRequest {
	/**
	 * Messages associated with the request.
	 */
	messages: string[]

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
}

export type AgentRequestSource = AgentRequest['source']
