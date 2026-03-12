import type { AgentAction } from '../../shared/types/AgentAction'
import { getActionMeta } from '../../shared/types/AgentAction'
import type { PromptPart } from '../../shared/types/PromptPart'
import type { SystemPromptCategory } from '../../shared/types/SystemPromptCategory'

export function getSystemPromptFlags(actions: AgentAction['_type'][], parts: PromptPart['type'][]) {
	return {
		// Communication
		hasMessage: actions.includes('message'),

		// Planning
		hasThink: actions.includes('think'),
		hasReview: actions.includes('review'),
		hasSetMyView: actions.includes('setMyView'),
		hasTodoList: actions.includes('update-todo-list') && parts.includes('todoList'),
		hasAddDetail: actions.includes('add-detail'),

		// Individual shapes
		hasCreate: actions.includes('create'),
		hasDelete: actions.includes('delete'),
		hasUpdate: actions.includes('update'),
		hasLabel: actions.includes('label'),
		hasMove: actions.includes('move'),

		// Groups of shapes
		hasPlace: actions.includes('place'),
		hasBringToFront: actions.includes('bringToFront'),
		hasSendToBack: actions.includes('sendToBack'),
		hasRotate: actions.includes('rotate'),
		hasResize: actions.includes('resize'),
		hasAlign: actions.includes('align'),
		hasDistribute: actions.includes('distribute'),
		hasStack: actions.includes('stack'),
		hasClear: actions.includes('clear'),

		// Drawing
		hasPen: actions.includes('pen'),

		// Request
		hasMessagesPart: parts.includes('messages'),
		hasDataPart: parts.includes('data'),
		hasContextItemsPart: parts.includes('contextItems'),

		// Viewport
		hasScreenshotPart: parts.includes('screenshot'),
		hasUserViewportBoundsPart: parts.includes('userViewportBounds'),
		hasAgentViewportBoundsPart: parts.includes('agentViewportBounds'),

		// Shapes
		hasBlurryShapesPart: parts.includes('blurryShapes'),
		hasPeripheralShapesPart: parts.includes('peripheralShapes'),
		hasSelectedShapesPart: parts.includes('selectedShapes'),

		// History
		hasChatHistoryPart: parts.includes('chatHistory'),
		hasUserActionHistoryPart: parts.includes('userActionHistory'),
		hasTodoListPart: parts.includes('todoList'),

		// Lints
		hasCanvasLintsPart: parts.includes('canvasLints'),

		// Metadata
		hasTimePart: parts.includes('time'),

		// Derived flags for convenience
		canEdit: actions.some(isEditAction),
	}
}

export type SystemPromptFlags = ReturnType<typeof getSystemPromptFlags>

function isEditAction(type: AgentAction['_type']): boolean {
	return isActionCategory(type, 'edit')
}

function isActionCategory(type: AgentAction['_type'], category: SystemPromptCategory): boolean {
	const meta = getActionMeta(type)
	if (!meta) return false
	if (!meta._systemPromptCategory) return false
	return meta._systemPromptCategory === category
}
