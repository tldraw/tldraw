import { BoxModel, JsonValue } from 'tldraw'
import { AgentModelName } from '../../worker/models'
import { SimpleShape } from '../format/SimpleShape'
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
	 * The type of request.
	 * - 'user' is a request from the user.
	 * - 'schedule' is a request from the schedule.
	 * - 'todo' is a request from outstanding todo items.
	 */
	type: 'user' | 'schedule' | 'todo'
}
