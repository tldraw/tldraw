import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import {
	ChatHistoryItem,
	FAIRY_VARIANTS,
	FairyConfig,
	FairyVariantType,
	PersistedFairyAgentState,
	PersistedFairyConfigs,
	PersistedFairyState,
} from '@tldraw/fairy-shared'
import { useCallback, useEffect, useRef } from 'react'
import { react, throttle, uniqueId, useEditor, useToasts, useValue } from 'tldraw'
import { TldrawApp } from '../tla/app/TldrawApp'
import { useApp } from '../tla/hooks/useAppState'
import { useTldrawUser } from '../tla/hooks/useUser'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $fairyProjects, $fairyTasks } from './fairy-globals'
import { getRandomFairyName } from './fairy-helpers/getRandomFairyName'
import { getRandomFairySign } from './fairy-helpers/getRandomFairySign'
import { disbandAllProjectsWithAgents } from './fairy-projects'
import { FairyThrowTool } from './FairyThrowTool'

function stripDiffFromChatItem(item: ChatHistoryItem): ChatHistoryItem {
	if (item.type === 'action') {
		const { diff: _diff, ...rest } = item
		return rest as ChatHistoryItem
	}
	return item
}

export function FairyApp({
	setAgents,
	fileId,
}: {
	setAgents(agents: FairyAgent[]): void
	fileId: string
}) {
	const editor = useEditor()
	const user = useTldrawUser()
	const app = useApp()
	const toasts = useToasts()
	const isReadOnly = useValue('isReadOnly', () => editor.getIsReadonly(), [editor])
	const fairyConfigs = useValue(
		'fairyConfigs',
		() => JSON.parse(app?.getUser().fairies || '{}') as PersistedFairyConfigs,
		[app]
	)

	const getToken = useCallback(async () => {
		if (!user) return undefined
		return await user.getToken()
	}, [user])

	const handleError = useCallback(
		(e: any) => {
			const message = typeof e === 'string' ? e : e instanceof Error && e.message
			const isRateLimit = message && message.toLowerCase().includes('rate limit')

			toasts.addToast({
				title: isRateLimit
					? app.getIntl().formatMessage(app.getMessage('fairy_rate_limit_title'))
					: 'Error',
				description: isRateLimit
					? app.getIntl().formatMessage(app.getMessage('fairy_rate_limit_exceeded'))
					: message || 'An error occurred',
				severity: 'error',
			})
			// Only log non-rate-limit errors to avoid noise in console
			if (!isRateLimit) {
				console.error(e)
			}
		},
		[toasts, app]
	)

	// Track whether we're currently loading state to prevent premature saves
	const isLoadingStateRef = useRef(false)
	// Keep a ref to agents so effects can access them
	const agentsRef = useRef<FairyAgent[]>([])
	// Track which agents have been loaded to avoid reloading existing agents
	const loadedAgentIdsRef = useRef<Set<string>>(new Set())
	const fairyTaskListLoadedRef = useRef(false)
	const projectsLoadedRef = useRef(false)

	// Create agents dynamically from configs
	useEffect(() => {
		if (!editor) return
		if (isReadOnly) return

		// Register the FairyThrowTool
		const selectTool = editor.root.children!.select
		editor.removeTool(FairyThrowTool, selectTool)
		editor.setTool(FairyThrowTool, selectTool)

		const configIds = Object.keys(fairyConfigs)
		const existingAgents = agentsRef.current
		const existingIds = new Set(existingAgents.map((a) => a.id))

		if (configIds.length < MAX_FAIRY_COUNT) {
			const id = createNewFairy(app)
			configIds.push(id)
		}

		// Find agents to create (new configs that don't have agents yet)
		const idsToCreate = configIds.filter((id) => !existingIds.has(id))

		// Find agents to dispose (agents that no longer have configs)
		const configIdsSet = new Set(configIds)
		const agentsToDispose = existingAgents.filter((agent) => !configIdsSet.has(agent.id))

		// Dispose removed agents and clean up tracking
		agentsToDispose.forEach((agent) => {
			agent.dispose()
			loadedAgentIdsRef.current.delete(agent.id)
		})

		// Create new agents
		const newAgents = idsToCreate.map((id) => {
			return new FairyAgent({
				id,
				app,
				editor,
				onError: handleError,
				getToken,
			})
		})

		// Keep existing agents that are still in config, add new ones
		const updatedAgents = [
			...existingAgents.filter((agent) => configIdsSet.has(agent.id)),
			...newAgents,
		]

		agentsRef.current = updatedAgents
		setAgents(updatedAgents)
	}, [fairyConfigs, editor, getToken, handleError, setAgents, app, isReadOnly])

	// Cleanup: dispose all agents only when component unmounts
	useEffect(() => {
		return () => {
			// Disband all projects - this interrupts agents, updates their state,
			// and clears associated tasks. Uses interrupt() which safely transitions
			// agents out of active modes without throwing.
			disbandAllProjectsWithAgents(agentsRef.current)

			// Now it's safe to dispose agents since they're no longer in active modes
			agentsRef.current.forEach((agent) => agent.dispose())
		}
	}, [])

	// Load fairy state from backend when agents are created
	useEffect(() => {
		if (!app || agentsRef.current.length === 0 || !$fairyTasks || !fileId) return

		const fileState = app.getFileState(fileId)
		if (fileState?.fairyState) {
			try {
				const fairyState: PersistedFairyState = JSON.parse(fileState.fairyState)

				// Mark that we're loading to prevent save watchers from firing
				isLoadingStateRef.current = true

				// Only restore state for agents that haven't been loaded yet
				agentsRef.current.forEach((agent) => {
					// Skip if already loaded
					if (loadedAgentIdsRef.current.has(agent.id)) return

					const persistedAgent = fairyState.agents[agent.id]
					if (persistedAgent) {
						agent.loadState(persistedAgent)
						loadedAgentIdsRef.current.add(agent.id)
					}
				})

				// Load shared todo list only once
				if (fairyState.fairyTaskList && !fairyTaskListLoadedRef.current) {
					$fairyTasks.set(fairyState.fairyTaskList)
					fairyTaskListLoadedRef.current = true
				}

				// Load projects only once
				if (fairyState.projects && !projectsLoadedRef.current) {
					$fairyProjects.set(fairyState.projects)
					projectsLoadedRef.current = true
				}

				// Allow a tick for state to settle before allowing saves
				setTimeout(() => {
					isLoadingStateRef.current = false
				}, 100)
			} catch (e) {
				console.error('Failed to load fairy state:', e)
				isLoadingStateRef.current = false
			}
		}
	}, [app, fairyConfigs, fileId])

	// Todo: Use FileStateUpdater for this
	// Save fairy state to backend periodically
	useEffect(() => {
		if (!app || agentsRef.current.length === 0 || !fileId) return

		const updateFairyState = throttle(() => {
			// Don't save if we're currently loading state
			if (isLoadingStateRef.current) return

			const fairyState: PersistedFairyState = {
				agents: agentsRef.current.reduce(
					(acc, agent) => {
						const agentState = agent.serializeState()
						// Strip diff field from chat history before sending
						if (agentState.chatHistory) {
							agentState.chatHistory = agentState.chatHistory.map(stripDiffFromChatItem)
						}
						acc[agent.id] = agentState
						return acc
					},
					{} as Record<string, PersistedFairyAgentState>
				),
				fairyTaskList: $fairyTasks.get(),
				projects: $fairyProjects.get(),
			}
			app.onFairyStateUpdate(fileId, fairyState)
		}, 2000) // Save maximum every 2 seconds

		// Watch for changes in fairy atoms
		const fairyCleanupFns: (() => void)[] = []
		agentsRef.current.forEach((agent) => {
			const cleanup = react(`${agent.id} state`, () => {
				agent.$fairyEntity.get()
				agent.$chatHistory.get()
				agent.$personalTodoList.get()
				updateFairyState()
			})
			fairyCleanupFns.push(cleanup)
		})

		const cleanupSharedFairyState = react('shared fairy atom state', () => {
			$fairyTasks.get()
			$fairyProjects.get()
			updateFairyState()
		})

		return () => {
			updateFairyState.flush()
			cleanupSharedFairyState()
			fairyCleanupFns.forEach((cleanup) => cleanup())
		}
	}, [app, fairyConfigs, fileId])

	// Append chat messages to database
	useEffect(() => {
		if (!app || agentsRef.current.length === 0 || !fileId) return

		const sentMessageIds = new Map<string, Set<string>>() // agentId -> Set of sent IDs

		// Initialize sent message IDs for all agents
		agentsRef.current.forEach((agent) => {
			const chatHistory = agent.$chatHistory.get()
			const sent = new Set<string>()

			chatHistory.forEach((item) => {
				// Skip legacy messages without IDs
				if (!item.id) return

				// Skip incomplete actions (mirror the sending logic)
				if (item.type === 'action' && !item.action.complete) return

				// Mark complete messages as sent
				sent.add(item.id)
			})

			sentMessageIds.set(agent.id, sent)
		})

		const appendMessages = throttle(() => {
			// Don't append if we're currently loading state
			if (isLoadingStateRef.current) return

			const allMessagesToAppend: ChatHistoryItem[] = []

			agentsRef.current.forEach((agent) => {
				const chatHistory = agent.$chatHistory.get()
				const sent = sentMessageIds.get(agent.id) || new Set()

				chatHistory.forEach((item) => {
					// Skip legacy messages without IDs
					if (!item.id) return

					// Skip incomplete actions
					if (item.type === 'action' && !item.action.complete) return

					// Skip if already sent
					if (sent.has(item.id)) return

					// Strip diff field from action items before sending
					allMessagesToAppend.push(stripDiffFromChatItem(item))
					sent.add(item.id)
				})
			})

			if (allMessagesToAppend.length > 0) {
				app.appendFairyChatMessages(fileId, allMessagesToAppend)
			}
		}, 2000) // Append maximum every 2 seconds

		const fairyCleanupFns: (() => void)[] = []
		agentsRef.current.forEach((agent) => {
			const cleanup = react(`${agent.id} chat history`, () => {
				agent.$chatHistory.get()
				appendMessages()
			})
			fairyCleanupFns.push(cleanup)
		})

		return () => {
			appendMessages.flush()
			fairyCleanupFns.forEach((cleanup) => cleanup())
		}
	}, [app, fairyConfigs, fileId])

	return null
}

function createNewFairy(app: TldrawApp) {
	const randomOutfit = {
		body: Object.keys(FAIRY_VARIANTS.body)[
			Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.body).length)
		] as FairyVariantType<'body'>,
		hat: Object.keys(FAIRY_VARIANTS.hat)[
			Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.hat).length)
		] as FairyVariantType<'hat'>,
		wings: Object.keys(FAIRY_VARIANTS.wings)[
			Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.wings).length)
		] as FairyVariantType<'wings'>,
	}

	// Create a unique ID for the new fairy
	const id = uniqueId()

	// Create the config for the new fairy
	const config: FairyConfig = {
		name: getRandomFairyName(),
		outfit: randomOutfit,
		sign: getRandomFairySign(),
	}

	// Add the config, which will trigger agent creation in FairyApp
	app.z.mutate.user.updateFairyConfig({ id, properties: config })

	return id
}
