import {
	AGENT_MODEL_DEFINITIONS,
	AgentModelName,
	ChatHistoryItem,
	DEFAULT_MODEL_NAME,
	FairyMemoryLevel,
	PROMPT_PART_DEFINITIONS,
} from '@tldraw/fairy-shared'
import { ReactNode, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	track,
	useValue,
} from 'tldraw'
import { F } from '../../../tla/utils/i18n'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { useChatHistory } from '../hooks/useFairyAgentChatHistory'

// # Home Debug Inspector Types and Labels
type HomeDebugInspectorType = 'projects' | 'fairyTaskList'
const HOME_DEBUG_INSPECTOR_TYPES: HomeDebugInspectorType[] = ['projects', 'fairyTaskList']

// # Fairy Debug Inspector Types and Labels
type FairyDebugInspectorType =
	| 'config'
	| 'actions'
	| 'chatHistory'
	| 'fairyEntity'
	| 'activeRequest'
	| 'scheduledRequest'
	| 'chatOrigin'
	| 'personalTodoList'
	| 'userActionHistory'
	| 'currentProjectId'
	// | 'cumulativeUsage'
	| 'mode'

const FAIRY_DEBUG_INSPECTOR_TYPES: FairyDebugInspectorType[] = [
	'config',
	'actions',
	'chatHistory',
	'fairyEntity',
	'activeRequest',
	'scheduledRequest',
	'chatOrigin',
	'personalTodoList',
	'userActionHistory',
	'currentProjectId',
	// 'cumulativeUsage',
	'mode',
]

// # Main dialog component
export function FairyDebugDialog({
	agents,
	onClose,
	initialTabId,
}: {
	agents: FairyAgent[]
	onClose(): void
	initialTabId?: string
}) {
	const [selectedTabId, setSelectedTabId] = useState<string>(initialTabId ?? 'home')
	const [fairyDebugInspectorType, setFairyDebugInspectorType] =
		useState<FairyDebugInspectorType>('config')
	const [homeDebugInspectorType, setHomeDebugInspectorType] =
		useState<HomeDebugInspectorType>('projects')

	const isHomeTab = selectedTabId === 'home'
	const selectedAgent = isHomeTab
		? null
		: agents.find((agent) => agent.id === selectedTabId) || agents[0]

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>Fairy Debug View</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>

			{/* Tabs: click to choose between home debug view and debug view for specific agents */}
			<div className="fairy-debug-tabs">
				<TldrawUiButton
					type="low"
					isActive={selectedTabId === 'home'}
					title="Home"
					onClick={() => setSelectedTabId('home')}
				>
					Home
				</TldrawUiButton>
				{agents.map((agent) => {
					const config = agent.getConfig()
					return (
						<TldrawUiButton
							key={agent.id}
							type="low"
							isActive={selectedTabId === agent.id}
							title={config.name || agent.id}
							onClick={() => setSelectedTabId(agent.id)}
						>
							{config.name || agent.id}
						</TldrawUiButton>
					)
				})}
			</div>

			{/* Fairy Debug Options: always visible when viewing an agent */}
			{!isHomeTab && selectedAgent && <FairyDebugOptions agent={selectedAgent} />}

			{/* Home debug options: always visible when viewing the home tab */}
			{isHomeTab && <HomeDebugOptions />}

			{/* View Dropdown: choose between different inspectable views for the given tab */}
			<div className="fairy-debug-view-dropdown">
				<label className="fairy-debug-view-label">View:</label>
				<TldrawUiDropdownMenuRoot id="debug-view-select">
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton type="low" className="fairy-debug-view-button">
							<TldrawUiButtonLabel>
								{isHomeTab ? (
									<DebugInspectorLabel type={homeDebugInspectorType} isHomeTab />
								) : (
									<DebugInspectorLabel type={fairyDebugInspectorType} isHomeTab={false} />
								)}
							</TldrawUiButtonLabel>
							<TldrawUiButtonIcon icon="chevron-down" small />
						</TldrawUiButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="top" className="fairy-debug-dropdown">
						{isHomeTab
							? HOME_DEBUG_INSPECTOR_TYPES.map((type) => (
									<DropdownMenuItem
										key={type}
										label={<DebugInspectorLabel type={type} isHomeTab />}
										onClick={() => setHomeDebugInspectorType(type)}
									/>
								))
							: FAIRY_DEBUG_INSPECTOR_TYPES.map((type) => (
									<DropdownMenuItem
										key={type}
										label={<DebugInspectorLabel type={type} isHomeTab={false} />}
										onClick={() => setFairyDebugInspectorType(type)}
									/>
								))}
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			</div>

			{/* Body: displays the selected view */}
			<TldrawUiDialogBody className="fairy-debug-dialog-body">
				{isHomeTab ? (
					<HomeDebugView homeDebugInspectorType={homeDebugInspectorType} />
				) : (
					selectedAgent && (
						<FairyDebugView agent={selectedAgent} inspectorType={fairyDebugInspectorType} />
					)
				)}
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>Close</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

// Helper component for debug inspector labels
function DebugInspectorLabel({
	type,
	isHomeTab,
}: {
	type: HomeDebugInspectorType | FairyDebugInspectorType
	isHomeTab: boolean
}) {
	if (isHomeTab) {
		const homeType = type as HomeDebugInspectorType
		if (homeType === 'projects') return 'Projects'
		if (homeType === 'fairyTaskList') return 'Task List'
	} else {
		const fairyType = type as FairyDebugInspectorType
		if (fairyType === 'config') return 'Config'
		if (fairyType === 'actions') return 'Actions'
		if (fairyType === 'chatHistory') return 'Chat History'
		if (fairyType === 'fairyEntity') return 'Fairy Entity'
		if (fairyType === 'activeRequest') return 'Active Request'
		if (fairyType === 'scheduledRequest') return 'Scheduled Request'
		if (fairyType === 'chatOrigin') return 'Chat Origin'
		if (fairyType === 'personalTodoList') return 'Personal Todo List'
		if (fairyType === 'userActionHistory') return 'User Action History'
		if (fairyType === 'currentProjectId') return 'Current Project ID'
		// if (fairyType === 'cumulativeUsage') return 'Cumulative Usage'
		if (fairyType === 'mode') return 'Mode'
	}
	return null
}

// # Home Debug View

function HomeDebugView({
	homeDebugInspectorType,
}: {
	homeDebugInspectorType: HomeDebugInspectorType
}) {
	return (
		<div className="fairy-debug-view-container">
			{homeDebugInspectorType === 'projects' && <ProjectsInspector />}
			{homeDebugInspectorType === 'fairyTaskList' && <FairyTaskInspector />}
		</div>
	)
}

// ## Home debug view inspector components

const ProjectsInspector = track(() => {
	const fairyApp = useFairyApp()
	if (!fairyApp) return null
	const projects = fairyApp.projects.getProjects()
	const fairyTasks = fairyApp.tasks.getTasks()

	return (
		<div className="fairy-debug-projects-container">
			<div className="fairy-debug-projects-header">Projects ({projects.length}):</div>
			{projects.length === 0 ? (
				<div className="fairy-debug-projects-empty">No projects yet</div>
			) : (
				projects.map((project: any, index: number) => {
					const projectTodos = fairyTasks.filter((todo: any) => todo.projectId === project.id)
					return (
						<div key={project.id} className="fairy-debug-project-card">
							<div className="fairy-debug-project-name">{project.title}</div>
							<div className="fairy-debug-project-details">
								<KeyValuePair label="id" value={project.id} />
								<KeyValuePair label="description" value={project.description} />
								<KeyValuePair label="plan" value={project.plan} />
								<KeyValuePair
									label="orchestrator"
									value={
										project.members.find(
											(member: any) =>
												member.role === 'orchestrator' || member.role === 'duo-orchestrator'
										)?.id
									}
								/>
								<KeyValuePair
									label="members"
									value={project.members.map((member: any) => member.id)}
								/>
							</div>
							<div className="fairy-debug-project-todos-section">
								<div className="fairy-debug-project-todos-header">
									Associated Todos ({projectTodos.length}):
								</div>
								{projectTodos.length === 0 ? (
									<div className="fairy-debug-project-todos-empty">
										No todos associated with this project
									</div>
								) : (
									<div className="fairy-debug-project-todos-list">
										{projectTodos.map((todo: any) => (
											<div key={todo.id} className="fairy-debug-project-todo-item">
												<pre className="fairy-debug-pre">{formatValue(todo)}</pre>
											</div>
										))}
									</div>
								)}
							</div>
							{index < projects.length - 1 && <hr className="fairy-debug-project-separator" />}
						</div>
					)
				})
			)}
		</div>
	)
})

const FairyTaskInspector = track(() => {
	const fairyApp = useFairyApp()
	if (!fairyApp) return null
	const fairyTasks = fairyApp.tasks.getTasks()

	return (
		<div className="fairy-debug-shared-todos-container">
			<div className="fairy-debug-shared-todos-header">Shared Todo List ({fairyTasks.length}):</div>
			{fairyTasks.length === 0 ? (
				<div className="fairy-debug-shared-todos-empty">No shared todos yet</div>
			) : (
				fairyTasks.map((todo: any, index: number) => (
					<div key={todo.id} className="fairy-debug-shared-todo-item">
						{/* <JsonDisplay value={todo} /> */}
						{Object.entries(todo).map(([key, value]) => (
							<KeyValuePair key={key} label={key} value={value} />
						))}
						{index < fairyTasks.length - 1 && <hr className="fairy-debug-shared-todo-separator" />}
					</div>
				))
			)}
		</div>
	)
})

const HomeDebugOptions = track(() => {
	const fairyApp = useFairyApp()
	if (!fairyApp) return null
	const debugFlags = fairyApp.getDebugFlags()
	const selectedModel = fairyApp.getModelSelection()
	const currentModel = selectedModel ?? DEFAULT_MODEL_NAME

	return (
		<div className="home-debug-options-container">
			<div className="fairy-debug-flags-container">
				<p>Debug Flags</p>
				<div className="fairy-debug-flags-checkboxes">
					<label className="fairy-debug-flags-checkbox">
						<input
							type="checkbox"
							checked={debugFlags.showTaskBounds}
							onChange={(e) => {
								fairyApp.setDebugFlags({
									...debugFlags,
									showTaskBounds: e.target.checked,
								})
							}}
						/>
						<span>Show Task Bounds</span>
					</label>
				</div>
			</div>
			<div className="fairy-debug-model-selection-container">
				<label className="fairy-debug-view-label">
					<F defaultMessage="Model:" />
				</label>
				<TldrawUiDropdownMenuRoot id="model-select">
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton type="low" className="fairy-debug-view-button">
							<TldrawUiButtonLabel>{currentModel}</TldrawUiButtonLabel>
							<TldrawUiButtonIcon icon="chevron-down" small />
						</TldrawUiButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="top" className="fairy-debug-dropdown">
						{Object.entries(AGENT_MODEL_DEFINITIONS).map(([modelName, modelDefinition]) => (
							<DropdownMenuItem
								key={modelName}
								label={modelDefinition.name}
								onClick={() => {
									fairyApp.setModelSelection(modelName as AgentModelName)
								}}
							/>
						))}
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			</div>
			<TldrawUiButton type="low" onClick={logPartDefinitionsByPriority}>
				<TldrawUiButtonLabel>Log Part Definitions by Priority</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
})

const FairyDebugOptions = track(({ agent }: { agent: FairyAgent }) => {
	const fairyApp = useFairyApp()
	const debugFlags = agent.$debugFlags.get()
	const oneShotMode = agent.$useOneShottingMode.get()

	return (
		<div className="fairy-debug-options-container">
			<div className="fairy-debug-flags-container">
				<p>Debug Flags</p>
				<div className="fairy-debug-flags-checkboxes">
					<label className="fairy-debug-flags-checkbox">
						<input
							type="checkbox"
							checked={debugFlags.logSystemPrompt}
							onChange={(e) => {
								agent.$debugFlags.set({
									...debugFlags,
									logSystemPrompt: e.target.checked,
								})
							}}
						/>
						<span>Log System Prompt</span>
					</label>
					<label className="fairy-debug-flags-checkbox">
						<input
							type="checkbox"
							checked={debugFlags.logMessages}
							onChange={(e) => {
								agent.$debugFlags.set({
									...debugFlags,
									logMessages: e.target.checked,
								})
							}}
						/>
						<span>Log Messages</span>
					</label>
					<label className="fairy-debug-flags-checkbox">
						<input
							type="checkbox"
							checked={debugFlags.logResponseTime}
							onChange={(e) => {
								agent.$debugFlags.set({
									...debugFlags,
									logResponseTime: e.target.checked,
								})
							}}
						/>
						<span>
							<F defaultMessage="Log response time" />
						</span>
					</label>
					<label className="fairy-debug-flags-checkbox">
						<input
							type="checkbox"
							checked={oneShotMode}
							onChange={(e) => {
								agent.$useOneShottingMode.set(e.target.checked)
							}}
						/>
						<span>One-Shot Mode</span>
					</label>
				</div>
			</div>

			<div className="fairy-debug-options-buttons">
				<TldrawUiButton
					type="low"
					onClick={() => {
						if (fairyApp) {
							fairyApp.projects.addAgentToDummyProject(agent.id)
						}
					}}
				>
					<TldrawUiButtonLabel>Add to dummy project</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="low" onClick={() => ((window as any).agent = agent)}>
					<TldrawUiButtonLabel>Set window.agent</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
		</div>
	)
})

// # Fairy Debug View

const FairyDebugView = track(
	({ agent, inspectorType }: { agent: FairyAgent; inspectorType: FairyDebugInspectorType }) => {
		// Call all hooks unconditionally to satisfy React's rules of hooks
		const fairyEntity = agent.getEntity()
		const activeRequest = agent.requests.getActiveRequest()
		const scheduledRequest = agent.requests.getScheduledRequest()
		const chatOrigin = agent.chatOrigin.getOrigin()
		const personalTodoList = agent.todos.getTodos()
		const userActionHistory = agent.userAction.getHistory()
		const currentProjectId = agent.getProject()?.id ?? null
		// const cumulativeUsage = agent.cumulativeUsage
		const mode = agent.mode.getMode()

		if (inspectorType === 'config') {
			return (
				<div className="fairy-debug-view-container">
					<ConfigInspector agent={agent} />
				</div>
			)
		}
		if (inspectorType === 'actions') {
			return (
				<div className="fairy-debug-view-container">
					<ActionsInspector agent={agent} />
				</div>
			)
		}
		if (inspectorType === 'chatHistory') {
			return (
				<div className="fairy-debug-view-container">
					<ChatHistoryInspector agent={agent} />
				</div>
			)
		}

		// For all other inspector types, use JsonDisplay
		const valueMap: Record<
			Exclude<FairyDebugInspectorType, 'config' | 'actions' | 'chatHistory'>,
			unknown
		> = {
			fairyEntity,
			activeRequest,
			scheduledRequest,
			chatOrigin,
			personalTodoList,
			userActionHistory,
			currentProjectId,
			// cumulativeUsage,
			mode,
		}

		const value =
			valueMap[
				inspectorType as Exclude<FairyDebugInspectorType, 'config' | 'actions' | 'chatHistory'>
			]
		return (
			<div className="fairy-debug-view-container">
				<JsonDisplay value={value} />
			</div>
		)
	}
)

// ## Fairy debug view inspector components

const ConfigInspector = track(({ agent }: { agent: FairyAgent }) => {
	const config = agent.getConfig()

	return (
		<div className="fairy-debug-config-container">
			<KeyValuePair label="id" value={agent.id} />
			{Object.entries(config).map(([key, value]) => (
				<KeyValuePair key={key} label={key} value={value} />
			))}
		</div>
	)
})

const ActionsInspector = track(({ agent }: { agent: FairyAgent }) => {
	const chatHistory = useChatHistory(agent)

	// Filter to only completed actions, and include all prompts and continuations
	const items: ChatHistoryItem[] = chatHistory.filter((item) => {
		if (item.type === 'action') {
			return item.action.complete === true
		}
		return true // Include all prompts and continuations
	})

	return (
		<div className="fairy-debug-container">
			<div className="fairy-debug-header">Chat History ({items.length})</div>
			{items.length === 0 ? (
				<div className="fairy-debug-empty">No chat history items yet</div>
			) : (
				items.map((item, index) => {
					const isLast = index === items.length - 1
					if (item.type === 'prompt') {
						return <PromptItem key={`prompt-${index}`} item={item} isLast={isLast} />
					}
					if (item.type === 'action') {
						return <ActionItem key={`action-${index}`} item={item} isLast={isLast} />
					}
					if (item.type === 'continuation') {
						return <ContinuationItem key={`continuation-${index}`} item={item} isLast={isLast} />
					}
					return null
				})
			)}
		</div>
	)

	function PromptItem({
		item,
		isLast,
	}: {
		item: Extract<ChatHistoryItem, { type: 'prompt' }>
		isLast: boolean
	}) {
		return (
			<>
				<div className="fairy-debug-item">
					<KeyValuePair label="type" value={item.type} />
					<KeyValuePair label="agentFacingMessages" value={item.agentFacingMessage} />
					<KeyValuePair label="userFacingMessages" value={item.userFacingMessage ?? null} />
				</div>
				{!isLast && <hr />}
			</>
		)
	}

	function ActionItem({
		item,
		isLast,
	}: {
		item: Extract<ChatHistoryItem, { type: 'action' }>
		isLast: boolean
	}) {
		return (
			<>
				<div className="fairy-debug-item">
					<KeyValuePair label="action" value={item.action} />
				</div>
				{!isLast && <hr />}
			</>
		)
	}

	function ContinuationItem({
		item,
		isLast,
	}: {
		item: Extract<ChatHistoryItem, { type: 'continuation' }>
		isLast: boolean
	}) {
		return (
			<>
				<div className="fairy-debug-item">
					<KeyValuePair label="type" value={item.type} />
					<KeyValuePair label="data" value={item.data} />
				</div>
				{!isLast && <hr />}
			</>
		)
	}
})

function ChatHistoryInspector({ agent }: { agent: FairyAgent }) {
	const chatHistory = useValue('chat history', () => agent.chat.getHistory(), [agent])

	return (
		<div className="fairy-debug-container">
			<div className="fairy-debug-header">Chat History ({chatHistory.length})</div>
			{chatHistory.length === 0 ? (
				<div className="fairy-debug-empty">No chat history items yet</div>
			) : (
				chatHistory.map((item, index) => {
					const isLast = index === chatHistory.length - 1
					if (item.type === 'prompt') {
						return <ChatHistoryPromptItem key={`prompt-${index}`} item={item} isLast={isLast} />
					}
					if (item.type === 'action') {
						return <ChatHistoryActionItem key={`action-${index}`} item={item} isLast={isLast} />
					}
					if (item.type === 'continuation') {
						return (
							<ChatHistoryContinuationItem
								key={`continuation-${index}`}
								item={item}
								isLast={isLast}
							/>
						)
					}
					if (item.type === 'memory-transition') {
						return (
							<ChatHistoryMemoryTransitionItem
								key={`memory-transition-${index}`}
								item={item}
								isLast={isLast}
							/>
						)
					}
					return null
				})
			)}
		</div>
	)

	function ChatHistoryPromptItem({
		item,
		isLast,
	}: {
		item: Extract<ChatHistoryItem, { type: 'prompt' }>
		isLast: boolean
	}) {
		return (
			<>
				<div
					className="fairy-debug-item"
					style={{ backgroundColor: getMemoryLevelColor(item.memoryLevel) }}
				>
					<KeyValuePair label="type" value={item.type} />
					<KeyValuePair label="promptSource" value={item.promptSource} />
					<KeyValuePair label="agentFacingMessages" value={item.agentFacingMessage} />
					<KeyValuePair label="userFacingMessages" value={item.userFacingMessage ?? null} />
					<KeyValuePair label="memoryLevel" value={item.memoryLevel} />
				</div>
				{!isLast && <hr />}
			</>
		)
	}

	function ChatHistoryActionItem({
		item,
		isLast,
	}: {
		item: Extract<ChatHistoryItem, { type: 'action' }>
		isLast: boolean
	}) {
		return (
			<>
				<div
					className="fairy-debug-item"
					style={{ backgroundColor: getMemoryLevelColor(item.memoryLevel) }}
				>
					<KeyValuePair label="type" value={item.type} />
					<KeyValuePair label="action" value={item.action} />
					<KeyValuePair label="memoryLevel" value={item.memoryLevel} />
				</div>
				{!isLast && <hr />}
			</>
		)
	}

	function ChatHistoryContinuationItem({
		item,
		isLast,
	}: {
		item: Extract<ChatHistoryItem, { type: 'continuation' }>
		isLast: boolean
	}) {
		return (
			<>
				<div
					className="fairy-debug-item"
					style={{ backgroundColor: getMemoryLevelColor(item.memoryLevel) }}
				>
					<KeyValuePair label="type" value={item.type} />
					<KeyValuePair label="data" value={item.data} />
					<KeyValuePair label="memoryLevel" value={item.memoryLevel} />
				</div>
				{!isLast && <hr />}
			</>
		)
	}

	function ChatHistoryMemoryTransitionItem({
		item,
		isLast,
	}: {
		item: Extract<ChatHistoryItem, { type: 'memory-transition' }>
		isLast: boolean
	}) {
		return (
			<>
				<div
					className="fairy-debug-item"
					style={{ backgroundColor: getMemoryLevelColor(item.memoryLevel) }}
				>
					<KeyValuePair label="type" value={item.type} />
					<KeyValuePair label="memoryLevel" value={item.memoryLevel} />
					<KeyValuePair label="message" value={item.agentFacingMessage} />
					<KeyValuePair label="userFacingMessage" value={item.userFacingMessage} />
				</div>
				{!isLast && <hr />}
			</>
		)
	}
}

// # Utility functions

/**
 * Returns a background color for a given memory level.
 */
function getMemoryLevelColor(memoryLevel: FairyMemoryLevel): string {
	switch (memoryLevel) {
		case 'fairy':
			return 'rgba(147, 51, 234, 0.1)' // Light purple
		case 'project':
			return 'rgba(59, 130, 246, 0.1)' // Light blue
		case 'task':
			return 'rgba(34, 197, 94, 0.1)' // Light green
		default:
			return 'transparent'
	}
}

/**
 * Logs all prompt part definitions ranked by priority.
 */
function logPartDefinitionsByPriority() {
	// Sort by priority (undefined priorities go to the top, then lower priority first)
	const sorted = [...PROMPT_PART_DEFINITIONS].sort((a, b) => {
		const aHasPriority = a.priority !== undefined
		const bHasPriority = b.priority !== undefined

		// If one has priority and the other doesn't, undefined goes first
		if (aHasPriority && !bHasPriority) return 1
		if (!aHasPriority && bHasPriority) return -1

		// If both have priority, sort by priority value
		if (aHasPriority && bHasPriority) {
			return a.priority! - b.priority!
		}

		// If neither has priority, maintain original order
		return 0
	})

	/* eslint-disable no-console */
	console.group('Prompt Part Definitions (ranked by priority)')
	sorted.forEach((def, index) => {
		const priority = def.priority !== undefined ? def.priority : 'N/A'
		console.log(`${index + 1}. ${def.type}: ${priority}`)
	})
	console.groupEnd()
	/* eslint-enable no-console */
}

/**
 * Format a value as a string for display in the debug view.
 */
function formatValue(value: unknown): string {
	if (value === null) return 'null'
	if (value === undefined) return 'undefined'
	if (typeof value === 'object') {
		return JSON.stringify(value, null, 2)
	}
	return String(value)
}

/**
 * Formats a key-value pair nicely for display in the debug view.
 */
function KeyValuePair({ label, value }: { label: string; value: unknown }) {
	return (
		<div className="fairy-debug-key-value">
			<span className="fairy-debug-label">{label}:</span>
			<pre className="fairy-debug-pre">{formatValue(value)}</pre>
		</div>
	)
}

/**
 * Displays any json value nicely for display in the debug view.
 * Less nicely than KeyValuePair, but works on whatever.
 */
function JsonDisplay({ value }: { value: unknown }) {
	return (
		<div className="fairy-debug-json-display">
			<pre className="fairy-debug-pre">{formatValue(value)}</pre>
		</div>
	)
}

/**
 *
 * Dropdown menu item wrapper with an onclick
 */
function DropdownMenuItem({ label, onClick }: { label: string | ReactNode; onClick(): void }) {
	return (
		<TldrawUiDropdownMenuItem>
			<TldrawUiButton type="menu" onClick={onClick}>
				<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
			</TldrawUiButton>
		</TldrawUiDropdownMenuItem>
	)
}
