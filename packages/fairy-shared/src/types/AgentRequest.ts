import { BoxModel } from '@tldraw/tlschema'
import { JsonValue } from '@tldraw/utils'

/**
 * Base properties shared by all agent requests.
 */
export interface AgentRequest {
	/**
	 * Messages associated with the request.
	 * These are the agent-facing messages that will be sent to the model.
	 */
	agentMessages: string[]

	/**
	 * Optional user-facing messages that will be displayed in the UI.
	 * Each index corresponds to the same index in the `messages` array.
	 * If a user-facing message is not provided for a particular message (null),
	 * the UI may fall back to displaying the agent-facing message.
	 * If this array is shorter than `messages`, missing entries are treated as null.
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
	 */
	source: 'user' | 'self' | 'other-agent'
}

export type AgentRequestSource = AgentRequest['source']
