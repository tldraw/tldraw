import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPart } from '../types/PromptPart'
import { TldrawFairyAgent } from '../types/TldrawFairyAgent'
import { BlurryShapesPartUtil } from './BlurryShapesPartUtil'
import { ChatHistoryPartUtil } from './ChatHistoryPartUtil'
import { ContextItemsPartUtil } from './ContextItemsPartUtil'
import { DataPartUtil } from './DataPartUtil'
import { MessagesPartUtil } from './MessagesPartUtil'
import { ModelNamePartUtil } from './ModelNamePartUtil'
import { PeripheralShapesPartUtil } from './PeripheralShapesPartUtil'
import { PromptPartUtil, PromptPartUtilConstructor } from './PromptPartUtil'
import { ScreenshotPartUtil } from './ScreenshotPartUtil'
import { SelectedShapesPartUtil } from './SelectedShapesPartUtil'
import { SystemPromptPartUtil } from './SystemPromptPartUtil'
import { TimePartUtil } from './TimePartUtil'
import { TodoListPartUtil } from './TodoListPartUtil'
import { UserActionHistoryPartUtil } from './UserActionHistoryPartUtil'
import { ViewportBoundsPartUtil } from './ViewportBoundsPartUtil'

/**
 * Prompt parts determine what information will be sent to the model.
 *
 * To stop sending something to the model, remove it from the list.
 * To send something new to the model, either change one of the existing parts, or add your own.
 */
export const PROMPT_PART_UTILS = [
	// Model
	SystemPromptPartUtil,
	ModelNamePartUtil,

	// Request
	MessagesPartUtil,
	DataPartUtil,
	ContextItemsPartUtil,

	// Viewport
	ScreenshotPartUtil,
	ViewportBoundsPartUtil,

	// Shapes
	BlurryShapesPartUtil,
	PeripheralShapesPartUtil,
	SelectedShapesPartUtil,

	// History
	ChatHistoryPartUtil,
	UserActionHistoryPartUtil,
	TodoListPartUtil,

	// Metadata
	TimePartUtil,
] satisfies PromptPartUtilConstructor<BasePromptPart>[]

/**
 * Get an object containing all prompt part utils.
 */
export function getPromptPartUtilsRecord(agent?: TldrawFairyAgent) {
	const object = {} as Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	for (const util of PROMPT_PART_UTILS) {
		object[util.type] = new util(agent)
	}
	return object
}

/**
 * Get an object containing only the specified prompt part utils.
 */
export function getPromptPartUtilsRecordByTypes(
	types: PromptPartUtilConstructor['type'][],
	agent?: TldrawFairyAgent
) {
	const object = {} as Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	const typeSet = new Set(types)
	for (const util of PROMPT_PART_UTILS) {
		if (typeSet.has(util.type)) {
			object[util.type] = new util(agent)
		}
	}
	return object
}
