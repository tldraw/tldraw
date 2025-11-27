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
import { $fairyProjects } from './FairyProjects'
import { FairyTaskDragTool } from './FairyTaskDragTool'
import { $fairyTasks, $showCanvasFairyTasks } from './FairyTaskList'
import { FairyThrowTool } from './FairyThrowTool'
import { getRandomFairyName } from './getRandomFairyName'
import { getRandomFairyPersonality } from './getRandomFairyPersonality'

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
	const showCanvasTodosLoadedRef = useRef(false)
	const projectsLoadedRef = useRef(false)
	// Track known message strings per agent to detect changes
	const knownMessageStringsRef = useRef<Record<string, Set<string>>>({})

	// Create agents dynamically from configs
	useEffect(() => {
		if (!editor) return

		// Register the FairyThrowTool
		const selectTool = editor.root.children!.select
		editor.removeTool(FairyThrowTool, selectTool)
		editor.setTool(FairyThrowTool, selectTool)

		// Register the TodoDragTool
		editor.removeTool(FairyTaskDragTool, selectTool)
		editor.setTool(FairyTaskDragTool, selectTool)

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
	}, [fairyConfigs, editor, getToken, handleError, setAgents, app])

	// Cleanup: dispose all agents only when component unmounts
	useEffect(() => {
		return () => {
			agentsRef.current.forEach((agent) => agent.dispose())
		}
	}, [])

	// Load fairy state from backend when agents are created
	useEffect(() => {
		if (!app || agentsRef.current.length === 0 || !$fairyTasks || !$showCanvasFairyTasks || !fileId)
			return

		const fileState = app.getFileState(fileId)
		if (fileState?.fairyState) {
			try {
				const fairyState: PersistedFairyState = JSON.parse(fileState.fairyState)

				// Mark that we're loading to prevent save watchers from firing
				isLoadingStateRef.current = true

				// Only restore state for agents that haven't been loaded yet
				agentsRef.current.forEach((agent) => {
					// Always initialize message string tracking (even for already-loaded agents)
					// This prevents duplicates after component remount
					if (!knownMessageStringsRef.current[agent.id]) {
						knownMessageStringsRef.current[agent.id] = new Set()
					}

					// Skip state loading if already loaded
					if (loadedAgentIdsRef.current.has(agent.id)) {
						// Still need to track any messages that were added since last mount
						const currentHistory = agent.$chatHistory.get()
						currentHistory.forEach((item: any) => {
							if (item.id) {
								knownMessageStringsRef.current[agent.id].add(JSON.stringify(item))
							}
						})
						return
					}

					const persistedAgent = fairyState.agents[agent.id]
					if (persistedAgent) {
						agent.loadState(persistedAgent)
						loadedAgentIdsRef.current.add(agent.id)

						// Add all loaded messages to known set (skip old messages without IDs)
						const loadedHistory = persistedAgent.chatHistory || []
						loadedHistory.forEach((item) => {
							if (item.id) {
								knownMessageStringsRef.current[agent.id].add(JSON.stringify(item))
							}
						})
					}
				})

				// Load shared todo list only once
				if (fairyState.fairyTaskList && !fairyTaskListLoadedRef.current) {
					$fairyTasks.set(fairyState.fairyTaskList)
					fairyTaskListLoadedRef.current = true
				}

				// Load show canvas todos only once
				if (fairyState.showCanvasTodos && !showCanvasTodosLoadedRef.current) {
					$showCanvasFairyTasks.set(fairyState.showCanvasTodos)
					showCanvasTodosLoadedRef.current = true
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

			const newHistoryItems: Record<string, ChatHistoryItem[]> = {}
			for (const agent of agentsRef.current) {
				const chatHistory = agent.$chatHistory.get()

				if (!knownMessageStringsRef.current[agent.id]) {
					knownMessageStringsRef.current[agent.id] = new Set()
				}

				// Only send messages with IDs that we haven't sent yet (or have changed)
				// Messages without IDs are old/legacy messages already synced
				// Only send complete actions (incomplete actions are still streaming)
				const newMessages = chatHistory.filter((item: any) => {
					if (!item.id) return false
					// Skip incomplete actions (still streaming)
					if (item.type === 'action' && !item.action.complete) return false
					const stringified = JSON.stringify(item)
					return !knownMessageStringsRef.current[agent.id].has(stringified)
				})

				if (newMessages.length > 0) {
					// Strip diffs from messages before sending
					const strippedMessages = newMessages.map((item: any) => {
						if (item.type === 'action' && 'diff' in item) {
							const { diff: _diff, ...rest } = item
							return rest
						}
						return item
					})
					newHistoryItems[agent.id] = strippedMessages

					// Track stringified messages (with diffs, before stripping)
					newMessages.forEach((item: any) => {
						knownMessageStringsRef.current[agent.id].add(JSON.stringify(item))
					})
				}
			}

			// Build state without chatHistory (server manages it)
			const fairyState: PersistedFairyState = {
				agents: agentsRef.current.reduce(
					(acc, agent) => {
						const serialized = agent.serializeState()
						acc[agent.id] = {
							fairyEntity: serialized.fairyEntity,
							chatOrigin: serialized.chatOrigin,
							personalTodoList: serialized.personalTodoList,
							chatHistory: [], // Empty - sent separately
						}
						return acc
					},
					{} as Record<string, PersistedFairyAgentState>
				),
				fairyTaskList: $fairyTasks.get(),
				showCanvasTodos: $showCanvasFairyTasks.get(),
				projects: $fairyProjects.get(),
			}
			app.onFairyStateUpdate(fileId, fairyState, newHistoryItems)
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
			$showCanvasFairyTasks.get()
			$fairyProjects.get()
			updateFairyState()
		})

		return () => {
			updateFairyState.flush()
			cleanupSharedFairyState()
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
		personality: getRandomFairyPersonality(),
	}

	// Add the config, which will trigger agent creation in FairyApp
	app.z.mutate.user.updateFairyConfig({ id, properties: config })

	return id
}
