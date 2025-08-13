import { AgentViewportScreenshotPartUtil } from './AgentViewportScreenshotPartUtil'
import { AgentViewportShapesPartUtil } from './AgentViewportShapesPartUtil'
import { ContextBoundsPartUtil } from './ContextBoundsPartUtil'
import { ContextItemsPartUtil } from './ContextItemsPartUtil'
import { CurrentUserViewportBoundsPartUtil } from './CurrentUserViewportBoundsPartUtil'
import { HistoryItemPartUtil } from './HistoryItemPartUtil'
import { MessagePartUtil } from './MessagePartUtil'
import { PeripheralContentPartUtil } from './PeripheralContentPartUtil'
import { PromptBoundsPartUtil } from './PromptBoundsPartUtil'
import { PromptPartUtilConstructor } from './PromptPartUitl'
import { UserSelectedShapesPartUtil } from './UserSelectedShapesPartUtil'

const promptPartUtils = [
	MessagePartUtil,
	ContextItemsPartUtil,
	UserSelectedShapesPartUtil,
	PromptBoundsPartUtil,
	CurrentUserViewportBoundsPartUtil,
	AgentViewportShapesPartUtil,
	ContextBoundsPartUtil,
	AgentViewportScreenshotPartUtil,
	HistoryItemPartUtil,
	PeripheralContentPartUtil,
] as const

export const PROMPT_PART_UTILS: Record<string, PromptPartUtilConstructor> = Object.fromEntries(
	promptPartUtils.map((util) => [util.type, util])
)
