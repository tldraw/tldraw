import { BoxModel } from '@tldraw/tlschema'
import { JsonValue } from '@tldraw/utils'
import { FocusedShape } from '../format/FocusedShape'
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
	selectedShapes: FocusedShape[]

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
	 * The type of request.
	 * - 'user' is a request from the user.
	 * - 'schedule' is a request from the schedule.
	 * - 'todo' is a request from outstanding todo items.
	 */
	type: 'user' | 'schedule' | 'todo' | 'augment-user-prompt'

	// WIP - should this be here or can we just access it from the agent? not sure if agent is accessible from new system prompt on server
	fairyPersonality: string
}
