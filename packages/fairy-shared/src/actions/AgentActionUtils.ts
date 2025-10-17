import z from 'zod'
import { AddDetailActionUtil } from '../actions/AddDetailActionUtil'
import { AgentActionUtil, AgentActionUtilConstructor } from '../actions/AgentActionUtil'
import { AlignActionUtil } from '../actions/AlignActionUtil'
import { BringToFrontActionUtil } from '../actions/BringToFrontActionUtil'
import { ClearActionUtil } from '../actions/ClearActionUtil'
import { CountryInfoActionUtil } from '../actions/CountryInfoActionUtil'
import { CountShapesActionUtil } from '../actions/CountShapesActionUtil'
import { CreateActionUtil } from '../actions/CreateActionUtil'
import { DeleteActionUtil } from '../actions/DeleteActionUtil'
import { DistributeActionUtil } from '../actions/DistributeActionUtil'
import { FlyToBoundsActionUtil } from '../actions/FlyToBoundsActionUtil'
import { LabelActionUtil } from '../actions/LabelActionUtil'
import { MessageActionUtil } from '../actions/MessageActionUtil'
import { MoveActionUtil } from '../actions/MoveActionUtil'
import { NoteToSelfActionUtil } from '../actions/NoteToSelfActionUtil'
import { PenActionUtil } from '../actions/PenActionUtil'
import { PlaceActionUtil } from '../actions/PlaceActionUtil'
import { RandomWikipediaArticleActionUtil } from '../actions/RandomWikipediaArticleActionUtil'
import { ResizeActionUtil } from '../actions/ResizeActionUtil'
import { ReviewActionUtil } from '../actions/ReviewActionUtil'
import { RotateActionUtil } from '../actions/RotateActionUtil'
import { SendToBackActionUtil } from '../actions/SendToBackActionUtil'
import { StackActionUtil } from '../actions/StackActionUtil'
import { ThinkActionUtil } from '../actions/ThinkActionUtil'
import { TodoListActionUtil } from '../actions/TodoListActionUtil'
import { UnknownActionUtil } from '../actions/UnknownActionUtil'
import { UpdateActionUtil } from '../actions/UpdateActionUtil'
import { AgentAction } from '../types/AgentAction'
import { BaseAgentAction } from '../types/BaseAgentAction'
import { TldrawFairyAgent } from '../types/TldrawFairyAgent'

/**
 * Agent actions determine what actions the agent can take.
 *
 * To prevent the agent from doing an action, remove it from the list.
 * To let the agent do more, either change one of the existing actions, or add your own.
 */
export const AGENT_ACTION_UTILS = [
	// Communication
	MessageActionUtil,

	// Planning
	ThinkActionUtil,
	ReviewActionUtil,
	AddDetailActionUtil,
	TodoListActionUtil,
	FlyToBoundsActionUtil,
	NoteToSelfActionUtil,

	// Individual shapes
	CreateActionUtil,
	DeleteActionUtil,
	UpdateActionUtil,
	LabelActionUtil,
	MoveActionUtil,

	// Groups of shapes
	PlaceActionUtil,
	BringToFrontActionUtil,
	SendToBackActionUtil,
	RotateActionUtil,
	ResizeActionUtil,
	AlignActionUtil,
	DistributeActionUtil,
	StackActionUtil,
	ClearActionUtil,

	// Drawing
	PenActionUtil,

	// External APIs
	RandomWikipediaArticleActionUtil,
	CountryInfoActionUtil,
	CountShapesActionUtil,

	// Internal (required)
	UnknownActionUtil,
] satisfies AgentActionUtilConstructor<BaseAgentAction>[]

/**
 * Get an object containing all agent action utils.
 */
export function getAgentActionUtilsRecord(agent?: TldrawFairyAgent) {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	for (const util of AGENT_ACTION_UTILS) {
		object[util.type] = new util(agent)
	}
	return object
}

/**
 * Get an object containing only the specified agent action utils.
 */
export function getAgentActionUtilsRecordByTypes(
	types: AgentActionUtilConstructor['type'][],
	agent?: TldrawFairyAgent
) {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	const typeSet = new Set(types)
	for (const util of AGENT_ACTION_UTILS) {
		if (typeSet.has(util.type)) {
			object[util.type] = new util(agent)
		}
	}
	return object
}

/**
 * Build the JSON schema for the agent's response format.
 */
export function buildResponseSchema(actions: AgentActionUtilConstructor['type'][]) {
	const actionUtils = getAgentActionUtilsRecordByTypes(actions)
	const actionSchemas = Object.values(actionUtils)
		.map((util) => util.getSchema(actions))
		.filter((schema) => schema !== null)
	const actionSchema = z.union(actionSchemas)
	const schema = z.object({
		actions: z.array(actionSchema),
	})

	return z.toJSONSchema(schema, { reused: 'ref' })
}
