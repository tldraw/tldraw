import { BoxModel, Editor, TLBinding, TLShape } from 'tldraw'
import { TLAgentModelName } from '../../worker/models'
import { TldrawAgentTransformConstructor } from '../transforms/TldrawAgentTransform'
import { ChatHistoryItem } from './ChatHistoryItem'
import { ContextItem } from './ContextItem'
import { ScheduledRequest } from './ScheduledRequest'

export interface TLAgentPromptOptions {
	editor: Editor
	transforms: TldrawAgentTransformConstructor[]

	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel
	meta: TLAgentPromptMeta
}

export interface TLAgentPrompt {
	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel
	meta: TLAgentPromptMeta

	canvasContent: TLAgentContent
	image: string | undefined
}

export interface TLAgentContent {
	shapes: TLShape[]
	bindings: TLBinding[]
}

export interface TLAgentPromptMeta {
	modelName: TLAgentModelName
	historyItems: ChatHistoryItem[]
	contextItems: ContextItem[]
	currentPageShapes: TLShape[]
	currentUserViewportBounds: BoxModel
	userSelectedShapes: TLShape[]
	type: ScheduledRequest['type']
}
