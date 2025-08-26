import { AlignActionUtil } from './actions/AlignActionUtil'
import { BringToFrontActionUtil } from './actions/BringToFrontActionUtil'
import { CreateActionUtil } from './actions/CreateActionUtil'
import { DebugActionUtil } from './actions/DebugActionUtil'
import { DeleteActionUtil } from './actions/DeleteActionUtil'
import { DistributeActionUtil } from './actions/DistributeActionUtil'
import { LabelActionUtil } from './actions/LabelActionUtil'
import { MessageActionUtil } from './actions/MessageActionUtil'
import { MoveActionUtil } from './actions/MoveActionUtil'
import { PenActionUtil } from './actions/PenActionUtil'
import { PlaceActionUtil } from './actions/PlaceActionUtil'
import { ResizeActionUtil } from './actions/ResizeActionUtil'
import { ReviewActionUtil } from './actions/ReviewActionUtil'
import { RotateActionUtil } from './actions/RotateActionUtil'
import { SendToBackActionUtil } from './actions/SendToBackActionUtil'
import { SetMyViewActionUtil } from './actions/SetMyViewActionUtil'
import { StackActionUtil } from './actions/StackActionUtil'
import { ThinkActionUtil } from './actions/ThinkActionUtil'
import { UnknownActionUtil } from './actions/UnknownActionUtil'
import { UpdateActionUtil } from './actions/UpdateActionUtil'
import { AgentViewportBoundsPartUtil } from './parts/AgentViewportBoundsPartUtil'
import { AgentViewportScreenshotPartUtil } from './parts/AgentViewportScreenshotPartUtil'
// import { AgentViewportSimpleShapesPartUtil } from './parts/AgentViewportSimpleShapesPartUtil'
import { AgentViewportBlurryShapesPartUtil } from './parts/AgentViewportBlurryShapesPartUtil.ts'
import { ContextItemsPartUtil } from './parts/ContextItemsPartUtil'
import { HistoryItemPartUtil } from './parts/HistoryItemPartUtil'
import { MessagePartUtil } from './parts/MessagePartUtil'
import { PeripheralShapesPartUtil } from './parts/PeripheralShapesPartUtil'
// import { PromptBoundsPartUtil } from './parts/PromptBoundsPartUtil'
import { TodoListActionUtil } from './actions/TodoListActionUtil'
import { PromptPartUtilConstructor } from './parts/PromptPartUtil'
import { SystemPromptPartUtil } from './parts/SystemPromptPartUtil'
import { TodoListPromptPartUtil } from './parts/TodoItemsPromptPart'
import { UserActionHistoryPartUtil } from './parts/UserActionHistoryPartUtil'
import { UserSelectedShapesPartUtil } from './parts/UserSelectedShapesPartUtil'
import { UserViewportBoundsPartUtil } from './parts/UserViewportBoundsPartUtil'

export const PROMPT_PART_UTILS: PromptPartUtilConstructor[] = [
	SystemPromptPartUtil,

	// The format of shape that the model is looking at
	AgentViewportBlurryShapesPartUtil,
	// AgentViewportSimpleShapesPartUtil,

	AgentViewportScreenshotPartUtil,
	AgentViewportBoundsPartUtil,
	ContextItemsPartUtil,
	UserViewportBoundsPartUtil,
	HistoryItemPartUtil,
	MessagePartUtil,
	PeripheralShapesPartUtil,
	// PromptBoundsPartUtil, //probably can be deleted, is vestigal from ai module and redundant with context bounds
	UserSelectedShapesPartUtil,
	UserActionHistoryPartUtil,

	TodoListPromptPartUtil,
]

export const EVENT_UTILS = [
	CreateActionUtil,
	DeleteActionUtil,

	UpdateActionUtil,
	LabelActionUtil,

	MoveActionUtil,
	PlaceActionUtil,
	BringToFrontActionUtil,
	SendToBackActionUtil,
	RotateActionUtil,
	ResizeActionUtil,

	AlignActionUtil,
	DistributeActionUtil,
	StackActionUtil,

	ReviewActionUtil,
	SetMyViewActionUtil,

	PenActionUtil,

	ThinkActionUtil,
	MessageActionUtil,
	DebugActionUtil,

	TodoListActionUtil,

	// Required:
	UnknownActionUtil,
]
