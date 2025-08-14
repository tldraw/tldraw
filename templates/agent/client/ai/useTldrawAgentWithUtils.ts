import { Editor } from 'tldraw'
import { AlignEventUtil } from '../events/AlignEventUtil'
import { CreateEventUtil } from '../events/CreateEventUtil'
import { DebugEventUtil } from '../events/DebugEventUtil'
import { DeleteEventUtil } from '../events/DeleteEventUtil'
import { DistributeEventUtil } from '../events/DistributeEventUtil'
import { LabelEventUtil } from '../events/LabelEventUtil'
import { MessageEventUtil } from '../events/MessageEventUtil'
import { MoveEventUtil } from '../events/MoveEventUtil'
import { PlaceEventUtil } from '../events/PlaceEventUtil'
import { ReviewEventUtil } from '../events/ReviewEventUtil'
import { SetMyViewEventUtil } from '../events/SetMyViewEventUtil'
import { StackEventUtil } from '../events/StackEventUtil'
import { ThinkEventUtil } from '../events/ThinkEventUtil'
import { UpdateEventUtil } from '../events/UpdateEventUtil'
import { AgentViewportBoundsPartUtil } from '../promptParts/AgentViewportBoundsPartUtil'
import { AgentViewportScreenshotPartUtil } from '../promptParts/AgentViewportScreenshotPartUtil'
import { AgentViewportShapesPartUtil } from '../promptParts/AgentViewportShapesPartUtil'
import { ContextItemsPartUtil } from '../promptParts/ContextItemsPartUtil'
import { HistoryItemPartUtil } from '../promptParts/HistoryItemPartUtil'
import { MessagePartUtil } from '../promptParts/MessagePartUtil'
import { PeripheralShapesPartUtil } from '../promptParts/PeripheralShapesPartUtil'
import { PromptBoundsPartUtil } from '../promptParts/PromptBoundsPartUtil'
import { UserSelectedShapesPartUtil } from '../promptParts/UserSelectedShapesPartUtil'
import { UserViewportBoundsPartUtil } from '../promptParts/UserViewportBoundsPartUtil'
import { useTldrawAgent } from './useTldrawAgent'

export const PART_UTILS = [
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
	UpdateEventUtil,
	DeleteEventUtil,
	CreateEventUtil,
	MoveEventUtil,
	PlaceEventUtil,
	StackEventUtil,
	AlignEventUtil,
	ReviewEventUtil,
	SetMyViewEventUtil,
	DistributeEventUtil,
	LabelEventUtil,
	ThinkEventUtil,
	MessageEventUtil,
	DebugEventUtil,
]

export function useTldrawAgentWithUtils(editor: Editor) {
	return useTldrawAgent({
		editor,
		partUtils: PART_UTILS,
		eventUtils: EVENT_UTILS,
	})
}
