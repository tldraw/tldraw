import { BoxModel, JsonValue } from 'tldraw'
import { SimpleShape } from '../format/SimpleShape'
import { AgentModelName } from '../models'
import { ContextItem } from './ContextItem'

/**
 * A request that we send to the agent.
 */
export interface AgentRequest {
	/**
	 * Messages associated with the request.
	 */
	messages: string[]

	/**
	 * Items that the agent should pay particular attention to.
	 */
	contextItems: ContextItem[]

	/**
	 * Any shapes that have been selected as part of this request.
	 */
	selectedShapes: SimpleShape[]

	/**
	 * Any extra data that has been retrieved as part of this request.
	 * All promises in this array will be resolved before the request is sent.
	 */
	data: (JsonValue | Promise<JsonValue>)[]

	/**
	 * The bounds of the request.
	 */
	bounds: BoxModel

	/**
	 * The model to use for the request.
	 */
	modelName: AgentModelName

	/**
	 * Where the request came from.
	 * - 'user' is a request from the user.
	 * - 'self' is a request from the agent itself.
	 * - 'other-agent' is a request from another agent.
	 */
	source: 'user' | 'self' | 'other-agent'
}

export type AgentRequestSource = AgentRequest['source']
