import { BoxModel } from 'tldraw'
import { AgentModelName } from '../../worker/models'
import { ISimpleShape } from '../format/SimpleShape'
import { AgentActionResult } from './AgentActionResult'
import { IContextItem } from './ContextItem'

export interface AgentRequest {
	/**
	 * A message associated with the request.
	 */
	message: string

	/**
	 * The bounds of the request.
	 */
	bounds: BoxModel

	/**
	 * The model to use for the request.
	 */
	modelName: AgentModelName

	/**
	 * Items that the agent should pay particular attention to.
	 */
	contextItems: IContextItem[]

	/**
	 * Any shapes that have been selected as part of this request.
	 */
	selectedShapes: ISimpleShape[]

	/**
	 * Results from actions carried out as part of a previous request.
	 */
	actionResults: AgentActionResult[]

	/**
	 * The type of request.
	 * - 'user' is a request from the user.
	 * - 'schedule' is a request from the schedule.
	 * - 'todo' is a request from outstanding todo items.
	 * - 'review' is a custom request type created by the ReviewActionUtil.
	 *
	 * You can add your own custom request types by adding them to this property,
	 * then making a prompt part behave differently based on the request type.
	 *
	 * For an example of this, see the MessagePartUtil that behaves differently based on the request type.
	 */
	type: 'user' | 'schedule' | 'todo' | 'review'
}
