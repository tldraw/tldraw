import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentEventUtil } from './AgentEventUtil'

/**
 * This event util is used when the event type is unknown.
 * This usually happens because the event type has not finished streaming yet.
 * Sometimes it happens because the model makes a mistake.
 */
export class UnknownEventUtil extends AgentEventUtil<IAgentEvent> {
	static override type = 'unknown' as const
}
