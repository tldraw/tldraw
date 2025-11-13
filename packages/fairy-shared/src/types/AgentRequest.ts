import { BoxModel } from '@tldraw/tlschema'
import { JsonValue } from '@tldraw/utils'
import { FocusedShape } from '../format/FocusedShape'
import { FAIRY_MODE_DEFINITIONS, FairyMode } from '../schema/FairyMode'
import { ContextItem } from './ContextItem'

/**
 * Helper type that extracts the available wands for a given mode ID.
 */
export type AvailableWandsForMode<ModeId extends FairyMode['id']> = Extract<
	(typeof FAIRY_MODE_DEFINITIONS)[number],
	{ id: ModeId }
>['availableWands'][number]

/**
 * Base properties shared by all agent requests.
 */
interface BaseAgentRequest {
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
	type: 'user' | 'schedule' | 'todo'
}

/**
 * A request that we send to the agent.
 * The wand type is constrained to only include wands available in the specified mode.
 */
export type AgentRequest = {
	[K in FairyMode['id']]: BaseAgentRequest & {
		/**
		 * Which mode to enter for this request.
		 */
		mode: K
		/**
		 * Which wand (set of actions) to use for this request.
		 * Must be one of the wands available in the specified mode.
		 */
		wand: AvailableWandsForMode<K>
	}
}[FairyMode['id']]
