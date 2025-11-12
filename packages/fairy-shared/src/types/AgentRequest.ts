import { BoxModel } from '@tldraw/tlschema'
import { JsonValue } from '@tldraw/utils'

/**
 * Base properties shared by all agent requests.
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
	 */
	source: 'user' | 'self' | 'other-agent' | 'schedule'
}
