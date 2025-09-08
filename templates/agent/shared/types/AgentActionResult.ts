import { RecordsDiff, TLRecord } from 'tldraw'
import { AgentAction } from './AgentAction'

/**
 * An object representing the result of applying an agent action.
 */
export interface AgentActionResult {
	/**
	 * The type of action that was applied.
	 */
	type: AgentAction['_type']

	/**
	 * The resultant diff of applying the action.
	 */
	diff: RecordsDiff<TLRecord>

	/**
	 * The return value of the action, if any.
	 */
	value?: Promise<any>
}
