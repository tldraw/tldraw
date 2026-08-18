import type { AgentAction } from '../../shared/types/AgentAction'
import type { PromptPart } from '../../shared/types/PromptPart'
import { AddDetailActionUtil } from '../actions/AddDetailActionUtil'
import { AlignActionUtil } from '../actions/AlignActionUtil'
import { BringToFrontActionUtil } from '../actions/BringToFrontActionUtil'
import { ClearActionUtil } from '../actions/ClearActionUtil'
import { CountryInfoActionUtil } from '../actions/CountryInfoActionUtil'
import { CountShapesActionUtil } from '../actions/CountShapesActionUtil'
import { CreateActionUtil } from '../actions/CreateActionUtil'
import { DeleteActionUtil } from '../actions/DeleteActionUtil'
import { DistributeActionUtil } from '../actions/DistributeActionUtil'
import { LabelActionUtil } from '../actions/LabelActionUtil'
import { MessageActionUtil } from '../actions/MessageActionUtil'
import { MoveActionUtil } from '../actions/MoveActionUtil'
import { PenActionUtil } from '../actions/PenActionUtil'
import { PlaceActionUtil } from '../actions/PlaceActionUtil'
import { ResizeActionUtil } from '../actions/ResizeActionUtil'
import { ReviewActionUtil } from '../actions/ReviewActionUtil'
import { RotateActionUtil } from '../actions/RotateActionUtil'
import { SendToBackActionUtil } from '../actions/SendToBackActionUtil'
import { SetMyViewActionUtil } from '../actions/SetMyViewActionUtil'
import { StackActionUtil } from '../actions/StackActionUtil'
import { ThinkActionUtil } from '../actions/ThinkActionUtil'
import { UnknownActionUtil } from '../actions/UnknownActionUtil'
import { UpdateActionUtil } from '../actions/UpdateActionUtil'
import { UpsertTodoListItemActionUtil } from '../actions/UpsertTodoListItemActionUtil'
import { AgentViewportBoundsPartUtil } from '../parts/AgentViewportBoundsPartUtil'
import { BlurryShapesPartUtil } from '../parts/BlurryShapesPartUtil'
import { CanvasLintsPartUtil } from '../parts/CanvasLintsPartUtil'
import { ChatHistoryPartUtil } from '../parts/ChatHistoryPartUtil'
import { ContextItemsPartUtil } from '../parts/ContextItemsPartUtil'
import { DataPartUtil } from '../parts/DataPartUtil'
import { DebugPartUtil } from '../parts/DebugPartUtil'
import { MessagesPartUtil } from '../parts/MessagesPartUtil'
import { ModelNamePartUtil } from '../parts/ModelNamePartUtil'
import { ModePartUtil } from '../parts/ModePartUtil'
import { PeripheralShapesPartUtil } from '../parts/PeripheralShapesPartUtil'
import { ScreenshotPartUtil } from '../parts/ScreenshotPartUtil'
import { SelectedShapesPartUtil } from '../parts/SelectedShapesPartUtil'
import { TimePartUtil } from '../parts/TimePartUtil'
import { TodoListPartUtil } from '../parts/TodoListPartUtil'
import { UserActionHistoryPartUtil } from '../parts/UserActionHistoryPartUtil'
import { UserViewportBoundsPartUtil } from '../parts/UserViewportBoundsPartUtil'

/**
 * What an agent can see and do when in a given mode.
 * Inactive modes cannot take actions (agent is idle/waiting).
 */
export type AgentModeDefinition = {
	type: string
} & (
	| {
			active: true
			/** What information will be sent to the model. */
			parts: PromptPart['type'][]
			/** What the agent can do. */
			actions: AgentAction['_type'][]
	  }
	| { active: false }
)

/**
 * All agent mode definitions. To add a new mode, add an object to this array.
 * Referencing the util classes here also guarantees they're registered when this module loads.
 */
export const AGENT_MODE_DEFINITIONS = [
	{
		type: 'idling',
		active: false,
	},
	{
		type: 'working',
		active: true,

		parts: [
			// Mode (sends metadata to worker)
			ModePartUtil.type,

			// Debug (sends debug flags to worker)
			DebugPartUtil.type,

			// Model
			ModelNamePartUtil.type,

			// Request
			MessagesPartUtil.type,
			DataPartUtil.type,
			ContextItemsPartUtil.type,

			// Viewport
			ScreenshotPartUtil.type,
			UserViewportBoundsPartUtil.type,
			AgentViewportBoundsPartUtil.type,

			// Shapes
			BlurryShapesPartUtil.type,
			PeripheralShapesPartUtil.type,
			SelectedShapesPartUtil.type,

			// History
			ChatHistoryPartUtil.type,
			UserActionHistoryPartUtil.type,
			TodoListPartUtil.type,

			// Lints
			CanvasLintsPartUtil.type,

			// Metadata
			TimePartUtil.type,
		],

		actions: [
			// Communication
			MessageActionUtil.type,

			// Planning
			ThinkActionUtil.type,
			ReviewActionUtil.type,
			AddDetailActionUtil.type,
			UpsertTodoListItemActionUtil.type,
			SetMyViewActionUtil.type,

			// Individual shapes
			CreateActionUtil.type,
			DeleteActionUtil.type,
			UpdateActionUtil.type,
			LabelActionUtil.type,
			MoveActionUtil.type,

			// Groups of shapes
			PlaceActionUtil.type,
			BringToFrontActionUtil.type,
			SendToBackActionUtil.type,
			RotateActionUtil.type,
			ResizeActionUtil.type,
			AlignActionUtil.type,
			DistributeActionUtil.type,
			StackActionUtil.type,
			ClearActionUtil.type,

			// Drawing
			PenActionUtil.type,

			// External APIs
			CountryInfoActionUtil.type,
			CountShapesActionUtil.type,

			// Internal (required)
			UnknownActionUtil.type,
		],
	},
] as const satisfies AgentModeDefinition[]

export type AgentModeDefinitionType = (typeof AGENT_MODE_DEFINITIONS)[number]
export type AgentModeType = AgentModeDefinitionType['type']

export function getAgentModeDefinition(type: AgentModeType): AgentModeDefinitionType {
	const mode = AGENT_MODE_DEFINITIONS.find((m) => m.type === type)
	if (!mode) throw new Error(`Unknown agent mode: ${type}`)
	return mode
}
