import { ChatHistoryItem, PROMPT_PART_DEFINITIONS } from '@tldraw/fairy-shared'
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
	useValue,
} from 'tldraw'
import { F } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $fairyDebugFlags } from './FairyDebugFlags'
import { $fairyProjects, addAgentToDummyProject } from './FairyProjects'
import { $fairyTasks } from './FairyTaskList'

// # Home Debug Inspector Types and Labels
type HomeDebugInspectorType = 'projects' | 'sharedTodoList'
const HOME_DEBUG_INSPECTOR_TYPES: HomeDebugInspectorType[] = ['projects', 'sharedTodoList']

// # Fairy Debug Inspector Types and Labels
type FairyDebugInspectorType =
	| 'config'
	| 'actions'
	| 'fairyEntity'
	| 'activeRequest'
	| 'scheduledRequest'
	| 'chatOrigin'
	| 'todoList'
	| 'userActionHistory'
	| 'currentProjectId'
	| 'cumulativeUsage'
	| 'mode'

const FAIRY_DEBUG_INSPECTOR_TYPES: FairyDebugInspectorType[] = [
	'config',
	'actions',
	'fairyEntity',
	'activeRequest',
	'scheduledRequest',
	'chatOrigin',
	'todoList',
	'userActionHistory',
	'currentProjectId',
	'cumulativeUsage',
	'mode',
]

// # Main dialog component
export function FairyDebugDialog({ agents, onClose }: { agents: FairyAgent[]; onClose(): void }) {
	const [selectedTabId, setSelectedTabId] = useState<string>('home')
	const [fairyDebugInspectorType, setFairyDebugInspectorType] =
		useState<FairyDebugInspectorType>('config')
	const [homeDebugInspectorType, setHomeDebugInspectorType] =
		useState<HomeDebugInspectorType>('projects')

	const isHomeTab = selectedTabId === 'home'
	const selectedAgent = isHomeTab
		? null
		: agents.find((agent) => agent.id === selectedTabId) || agents[0]

	return (
		<div className="fairy-debug-dialog-wrapper">
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Fairy Debug View" />
				</TldrawUiDialogTitle>
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
					<F defaultMessage="Home" />
				</TldrawUiButton>
				{agents.map((agent) => {
					const config = agent.$fairyConfig.get()
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
				<label className="fairy-debug-view-label">
					<F defaultMessage="View:" />
				</label>
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
					<TldrawUiButtonLabel>
						<F defaultMessage="Close" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</div>
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
		if (homeType === 'projects') return <F defaultMessage="Projects" />
		if (homeType === 'sharedTodoList') return <F defaultMessage="Shared Todo List" />
	} else {
		const fairyType = type as FairyDebugInspectorType
		if (fairyType === 'config') return <F defaultMessage="Config" />
		if (fairyType === 'actions') return <F defaultMessage="Actions" />
		if (fairyType === 'fairyEntity') return <F defaultMessage="Fairy Entity" />
		if (fairyType === 'activeRequest') return <F defaultMessage="Active Request" />
		if (fairyType === 'scheduledRequest') return <F defaultMessage="Scheduled Request" />
		if (fairyType === 'chatOrigin') return <F defaultMessage="Chat Origin" />
		if (fairyType === 'todoList') return <F defaultMessage="Todo List" />
		if (fairyType === 'userActionHistory') return <F defaultMessage="User Action History" />
		if (fairyType === 'currentProjectId') return <F defaultMessage="Current Project ID" />
		if (fairyType === 'cumulativeUsage') return <F defaultMessage="Cumulative Usage" />
		if (fairyType === 'mode') return <F defaultMessage="Mode" />
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
			{homeDebugInspectorType === 'sharedTodoList' && <SharedTodoListInspector />}
		</div>
	)
}

// ## Home debug view inspector components

function ProjectsInspector() {
	const projects = useValue($fairyProjects)
	const sharedTodos = useValue($fairyTasks)

	return (
		<div className="fairy-debug-projects-container">
			<div className="fairy-debug-projects-header">
				<F defaultMessage="Projects:" values={{ count: projects.length }} />
			</div>
			{projects.length === 0 ? (
				<div className="fairy-debug-projects-empty">
					<F defaultMessage="No projects yet" />
				</div>
			) : (
				projects.map((project, index) => {
					const projectTodos = sharedTodos.filter((todo) => todo.projectId === project.id)
					return (
						<div key={project.id} className="fairy-debug-project-card">
							<div className="fairy-debug-project-name">{project.title}</div>
							<div className="fairy-debug-project-details">
								<KeyValuePair label="id" value={project.id} />
								<KeyValuePair label="description" value={project.description} />
								<KeyValuePair label="plan" value={project.plan} />
								<KeyValuePair
									label="orchestrator"
									value={project.members.find((member) => member.role === 'orchestrator')?.id}
								/>
								<KeyValuePair label="members" value={project.members} />
							</div>
							<div className="fairy-debug-project-todos-section">
								<div className="fairy-debug-project-todos-header">
									<F defaultMessage="Associated Todos:" values={{ count: projectTodos.length }} />
								</div>
								{projectTodos.length === 0 ? (
									<div className="fairy-debug-project-todos-empty">
										<F defaultMessage="No todos associated with this project" />
									</div>
								) : (
									<div className="fairy-debug-project-todos-list">
										{projectTodos.map((todo) => (
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
}

function SharedTodoListInspector() {
	const sharedTodos = useValue($fairyTasks)

	return (
		<div className="fairy-debug-shared-todos-container">
			<div className="fairy-debug-shared-todos-header">
				<F defaultMessage="Shared Todo List:" values={{ count: sharedTodos.length }} />
			</div>
			{sharedTodos.length === 0 ? (
				<div className="fairy-debug-shared-todos-empty">
					<F defaultMessage="No shared todos yet" />
				</div>
			) : (
				sharedTodos.map((todo, index) => (
					<div key={todo.id} className="fairy-debug-shared-todo-item">
						{/* <JsonDisplay value={todo} /> */}
						{Object.entries(todo).map(([key, value]) => (
							<KeyValuePair key={key} label={key} value={value} />
						))}
						{index < sharedTodos.length - 1 && <hr className="fairy-debug-shared-todo-separator" />}
					</div>
				))
			)}
		</div>
	)
}

function HomeDebugOptions() {
	const debugFlags = useValue($fairyDebugFlags)

	return (
		<div className="home-debug-options-container">
			<div className="fairy-debug-flags-container">
				<p>
					<F defaultMessage="Debug Flags" />
				</p>
				<div className="fairy-debug-flags-checkboxes">
					<label className="fairy-debug-flags-checkbox">
						<input
							type="checkbox"
							checked={debugFlags.showTaskBounds}
							onChange={(e) => {
								$fairyDebugFlags.set({
									...debugFlags,
									showTaskBounds: e.target.checked,
								})
							}}
						/>
						<span>
							<F defaultMessage="Show Task Bounds" />
						</span>
					</label>
				</div>
			</div>
			<TldrawUiButton type="low" onClick={logPartDefinitionsByPriority}>
				<TldrawUiButtonLabel>
					<F defaultMessage="Log Part Definitions by Priority" />
				</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}

function FairyDebugOptions({ agent }: { agent: FairyAgent }) {
	const debugFlags = useValue(agent.$debugFlags)

	return (
		<div className="fairy-debug-options-container">
			<div className="fairy-debug-flags-container">
				<p>
					<F defaultMessage="Debug Flags" />
				</p>
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
						<span>
							<F defaultMessage="Log System Prompt" />
						</span>
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
						<span>
							<F defaultMessage="Log Messages" />
						</span>
					</label>
				</div>
			</div>

			<div className="fairy-debug-options-buttons">
				<TldrawUiButton type="low" onClick={() => addAgentToDummyProject(agent.id)}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Add to Dummy Project" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="low" onClick={() => ((window as any).agent = agent)}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Set window.agent" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
		</div>
	)
}

// # Fairy Debug View

function FairyDebugView({
	agent,
	inspectorType,
}: {
	agent: FairyAgent
	inspectorType: FairyDebugInspectorType
}) {
	// Call all hooks unconditionally to satisfy React's rules of hooks
	const fairyEntity = useValue(agent.$fairyEntity)
	const activeRequest = useValue(agent.$activeRequest)
	const scheduledRequest = useValue(agent.$scheduledRequest)
	const chatOrigin = useValue(agent.$chatOrigin)
	const todoList = useValue(agent.$todoList)
	const userActionHistory = useValue(agent.$userActionHistory)
	const currentProjectId = agent.getProject()?.id
	const cumulativeUsage = agent.cumulativeUsage
	const mode = agent.getMode()

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

	// For all other inspector types, use JsonDisplay
	const valueMap: Record<Exclude<FairyDebugInspectorType, 'config' | 'actions'>, unknown> = {
		fairyEntity,
		activeRequest,
		scheduledRequest,
		chatOrigin,
		todoList,
		userActionHistory,
		currentProjectId,
		cumulativeUsage,
		mode,
	}

	const value = valueMap[inspectorType as Exclude<FairyDebugInspectorType, 'config' | 'actions'>]
	return (
		<div className="fairy-debug-view-container">
			<JsonDisplay value={value} />
		</div>
	)
}

// ## Fairy debug view inspector components

function ConfigInspector({ agent }: { agent: FairyAgent }) {
	const config = useValue(agent.$fairyConfig)

	return (
		<div className="fairy-debug-config-container">
			<KeyValuePair label="id" value={agent.id} />
			{Object.entries(config).map(([key, value]) => (
				<KeyValuePair key={key} label={key} value={value} />
			))}
		</div>
	)
}

function ActionsInspector({ agent }: { agent: FairyAgent }) {
	const chatHistory = useValue(agent.$chatHistory)

	// Filter to only completed actions, and include all prompts and continuations
	const items: ChatHistoryItem[] = chatHistory.filter((item) => {
		if (item.type === 'action') {
			return item.action.complete === true
		}
		return true // Include all prompts and continuations
	})

	return (
		<div className="fairy-debug-container">
			<div className="fairy-debug-header">
				<F defaultMessage="Chat History" values={{ count: items.length }} />
			</div>
			{items.length === 0 ? (
				<div className="fairy-debug-empty">
					<F defaultMessage="No chat history items yet" />
				</div>
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
					<KeyValuePair label="message" value={item.message} />
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
}

// # Utility functions

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
