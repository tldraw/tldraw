import { AlignEventUtil } from './events/AlignEventUtil'
import { BringToFrontEventUtil } from './events/BringToFrontEventUtil'
import { CreateEventUtil } from './events/CreateEventUtil'
import { DebugEventUtil } from './events/DebugEventUtil'
import { DeleteEventUtil } from './events/DeleteEventUtil'
import { DistributeEventUtil } from './events/DistributeEventUtil'
import { LabelEventUtil } from './events/LabelEventUtil'
import { MessageEventUtil } from './events/MessageEventUtil'
import { MoveEventUtil } from './events/MoveEventUtil'
import { PlaceEventUtil } from './events/PlaceEventUtil'
import { ReviewEventUtil } from './events/ReviewEventUtil'
import { RotateEventUtil } from './events/RotateEventUtil'
import { SendToBackEventUtil } from './events/SendToBackEventUtil'
import { SetMyViewEventUtil } from './events/SetMyViewEventUtil'
import { StackEventUtil } from './events/StackEventUtil'
import { ThinkEventUtil } from './events/ThinkEventUtil'
import { UnknownEventUtil } from './events/UnknownEventUtil'
import { UpdateEventUtil } from './events/UpdateEventUtil'
import { AgentViewportBoundsPartUtil } from './parts/AgentViewportBoundsPartUtil'
import { AgentViewportScreenshotPartUtil } from './parts/AgentViewportScreenshotPartUtil'
import { AgentViewportShapesPartUtil } from './parts/AgentViewportShapesPartUtil'
import { ContextItemsPartUtil } from './parts/ContextItemsPartUtil'
import { HistoryItemPartUtil } from './parts/HistoryItemPartUtil'
import { MessagePartUtil } from './parts/MessagePartUtil'
import { PeripheralShapesPartUtil } from './parts/PeripheralShapesPartUtil'
import { PromptBoundsPartUtil } from './parts/PromptBoundsPartUtil'
import { PromptPartUtilConstructor } from './parts/PromptPartUtil'
import { SystemPromptPartUtil } from './parts/SystemPromptPartUtil'
import { UserSelectedShapesPartUtil } from './parts/UserSelectedShapesPartUtil'
import { UserViewportBoundsPartUtil } from './parts/UserViewportBoundsPartUtil'

export const PROMPT_PART_UTILS: PromptPartUtilConstructor[] = [
	SystemPromptPartUtil,
	AgentViewportScreenshotPartUtil,
	AgentViewportShapesPartUtil,
	AgentViewportBoundsPartUtil,
	ContextItemsPartUtil,
	UserViewportBoundsPartUtil,
	HistoryItemPartUtil,
	MessagePartUtil,
	PeripheralShapesPartUtil,
	PromptBoundsPartUtil,
	UserSelectedShapesPartUtil,
]

export const EVENT_UTILS = [
	CreateEventUtil,
	DeleteEventUtil,

	UpdateEventUtil,
	LabelEventUtil,

	MoveEventUtil,
	PlaceEventUtil,
	BringToFrontEventUtil,
	SendToBackEventUtil,
	RotateEventUtil,

	AlignEventUtil,
	DistributeEventUtil,
	StackEventUtil,

	ReviewEventUtil,
	SetMyViewEventUtil,

	ThinkEventUtil,
	MessageEventUtil,
	DebugEventUtil,

	// Required:
	UnknownEventUtil,
]
