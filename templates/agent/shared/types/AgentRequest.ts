import { BoxModel } from 'tldraw'
import { AgentModelName } from '../../worker/models'
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
	 * The type of request.
	 */
	type: 'user' | 'review' | 'setMyView' | 'continue'
}
