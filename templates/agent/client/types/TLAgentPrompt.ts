import { TLAiPrompt, TLAiSerializedPrompt } from '@tldraw/ai'
import { BoxModel, TLShape } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { ChatHistoryItem } from './ChatHistoryItem'
import { ContextItem } from './ContextItem'
import { ScheduledRequest } from './ScheduledRequest'

export type TLAgentPrompt = Omit<TLAiPrompt, 'meta'> & { meta: TLAgentPromptMeta }
export type TLAgentSerializedPrompt = Omit<TLAiSerializedPrompt, 'meta'> & {
	meta: TLAgentPromptMeta
}

export type MetaDebugType = TLAgentSerializedPrompt['meta']

export interface TLAgentPromptMeta {
	modelName: TLAgentModelName
	historyItems: ChatHistoryItem[]
	contextItems: ContextItem[]
	currentPageShapes: TLShape[]
	currentUserViewportBounds: BoxModel
	userSelectedShapes: TLShape[]
	type: ScheduledRequest['type']
}
