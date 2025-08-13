import { AgentViewportBoundsPartUtil } from './AgentViewportBoundsPartUtil'
import { AgentViewportScreenshotPartUtil } from './AgentViewportScreenshotPartUtil'
import { AgentViewportShapesPartUtil } from './AgentViewportShapesPartUtil'
import { ContextItemsPartUtil } from './ContextItemsPartUtil'
import { HistoryItemPartUtil } from './HistoryItemPartUtil'
import { MessagePartUtil } from './MessagePartUtil'
import { PeripheralShapesPartUtil } from './PeripheralShapesPartUtil'
import { PromptBoundsPartUtil } from './PromptBoundsPartUtil'
import { UserSelectedShapesPartUtil } from './UserSelectedShapesPartUtil'
import { UserViewportBoundsPartUtil } from './UserViewportBoundsPartUtil'

export const PROMPT_PART_UTIL_CONSTRUCTORS = [
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
] as const
