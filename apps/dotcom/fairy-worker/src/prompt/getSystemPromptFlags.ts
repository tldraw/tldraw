import { ActiveFairyModeDefinition, AgentAction, PromptPart } from '@tldraw/fairy-shared'

export function getSystemPromptFlags(
	mode: ActiveFairyModeDefinition['type'],
	actions: AgentAction['_type'][],
	parts: PromptPart['type'][]
) {
	return {
		// Mode flags
		isOneshotting: mode === 'one-shotting',
		isSoloing: mode === 'soloing',
		isWorking:
			mode === 'working-drone' || mode === 'working-solo' || mode === 'working-orchestrator',
		isOrchestrating: mode === 'orchestrating-active',
		isDuoOrchestrating: mode === 'duo-orchestrating-active',

		// Communication
		hasMessage: actions.includes('message'),

		// Planning
		hasThink: actions.includes('think'),
		hasReview: actions.includes('review'),
		hasFlyToBounds: actions.includes('fly-to-bounds'),
		hasPersonalTodoList:
			actions.includes('upsert-personal-todo-item') && parts.includes('personalTodoList'),

		// Individual shapes
		hasCreate: actions.includes('create'),
		hasDelete: actions.includes('delete'),
		hasUpdate: actions.includes('update'),
		hasLabel: actions.includes('label'),
		hasMove: actions.includes('move'),

		// Groups of shapes
		hasPlace: actions.includes('place'),
		hasBringToFront: actions.includes('bring-to-front'),
		hasSendToBack: actions.includes('send-to-back'),
		hasRotate: actions.includes('rotate'),
		hasResize: actions.includes('resize'),
		hasAlign: actions.includes('align'),
		hasDistribute: actions.includes('distribute'),
		hasStack: actions.includes('stack'),

		// Drawing
		hasPen: actions.includes('pen'),

		// Page navigation
		hasChangePage: actions.includes('change-page'),
		hasCreatePage: actions.includes('create-page'),

		// Task management
		hasCreateSoloTask: actions.includes('create-task'),
		hasCreateProjectTask: actions.includes('create-project-task'),
		hasStartTask: actions.includes('start-task'),
		hasMarkTaskDone: actions.includes('mark-my-task-done'),
		hasClaimTodoItem: actions.includes('claim-todo-item'),

		// Project management
		hasActivateFairy: actions.includes('activate-agent'),

		// Internal (required)
		hasUnknown: actions.includes('unknown'),

		// Request
		hasMessagesPart: parts.includes('messages'),
		hasDataPart: parts.includes('data'),

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

		// Tasks
		hasSoloTasksPart: parts.includes('soloTasks'),
		hasWorkingTasksPart: parts.includes('workingTasks'),

		// Metadata
		hasTimePart: parts.includes('time'),
		hasPagesPart: parts.includes('pages'),
		hasModePart: parts.includes('mode'),
		hasDebugPart: parts.includes('debug'),

		// Collaboration
		hasOtherFairiesPart: parts.includes('otherFairies'),

		// Project
		hasCurrentProjectPart:
			parts.includes('currentProjectDrone') || parts.includes('currentProjectOrchestrator'),

		// assign todo item
		hasAssignTodoItem: actions.includes('direct-to-start-project-task'),

		// sign
		hasSignPart: parts.includes('sign'),

		//orchestration
		hasStartProject: actions.includes('start-project'),
		isOrchestrator: actions.includes('end-project'),

		canEdit:
			actions.includes('update') ||
			actions.includes('delete') ||
			actions.includes('move') ||
			actions.includes('label') ||
			actions.includes('place') ||
			actions.includes('bring-to-front') ||
			actions.includes('send-to-back') ||
			actions.includes('resize') ||
			actions.includes('rotate') ||
			actions.includes('align') ||
			actions.includes('distribute') ||
			actions.includes('stack'),
	}
}

export type SystemPromptFlags = ReturnType<typeof getSystemPromptFlags>
