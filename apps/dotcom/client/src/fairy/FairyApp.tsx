import { PersistedFairyAgentState, PersistedFairyState } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useRef } from 'react'
import { react, throttle, useEditor } from 'tldraw'
import { useMaybeApp } from '../tla/hooks/useAppState'
import { useTldrawUser } from '../tla/hooks/useUser'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { FairyConfig } from './FairyConfig'
import { FairyThrowTool } from './FairyThrowTool'
import { $sharedTodoList } from './SharedTodoList'
import { TodoDragTool } from './TodoDragTool'

export interface PersistedFairyConfigs {
	[fairyId: string]: FairyConfig
}

export function FairyApp({
	setAgents,
	fairyConfigs,
	fileId,
}: {
	setAgents(agents: FairyAgent[]): void
	fairyConfigs: PersistedFairyConfigs
	fileId: string
}) {
	const editor = useEditor()
	const user = useTldrawUser()
	const app = useMaybeApp()

	const getToken = useCallback(async () => {
		if (!user) return undefined
		return await user.getToken()
	}, [user])

	const handleError = useCallback((e: any) => {
		console.error('Error:', e)
	}, [])

	// Track whether we're currently loading state to prevent premature saves
	const isLoadingStateRef = useRef(false)
	// Keep a ref to agents so effects can access them
	const agentsRef = useRef<FairyAgent[]>([])
	// Track which agents have been loaded to avoid reloading existing agents
	const loadedAgentIdsRef = useRef<Set<string>>(new Set())
	const sharedTodoListLoadedRef = useRef(false)

	// Create agents dynamically from configs
	useEffect(() => {
		if (!editor) return

		// Register the FairyThrowTool
		editor.removeTool(FairyThrowTool)
		editor.setTool(FairyThrowTool)

		// Register the TodoDragTool
		editor.removeTool(TodoDragTool)
		editor.setTool(TodoDragTool)

		const configIds = Object.keys(fairyConfigs)
		const existingAgents = agentsRef.current
		const existingIds = new Set(existingAgents.map((a) => a.id))

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
				fairyConfig: fairyConfigs[id],
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
	}, [fairyConfigs, editor, getToken, handleError, setAgents])

	// Cleanup: dispose all agents only when component unmounts
	useEffect(() => {
		return () => {
			agentsRef.current.forEach((agent) => agent.dispose())
		}
	}, [])

	// Load fairy state from backend when agents are created
	useEffect(() => {
		if (!app || agentsRef.current.length === 0 || !$sharedTodoList || !fileId) return

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
				if (fairyState.sharedTodoList && !sharedTodoListLoadedRef.current) {
					$sharedTodoList.set(fairyState.sharedTodoList)
					sharedTodoListLoadedRef.current = true
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
		if (!app || agentsRef.current.length === 0 || !$sharedTodoList || !fileId) return

		const updateFairyState = throttle(() => {
			// Don't save if we're currently loading state
			if (isLoadingStateRef.current) return

			const fairyState: PersistedFairyState = {
				agents: agentsRef.current.reduce(
					(acc, agent) => {
						acc[agent.id] = agent.serializeState()
						return acc
					},
					{} as Record<string, PersistedFairyAgentState>
				),
				sharedTodoList: $sharedTodoList.get(),
			}
			app.onFairyStateUpdate(fileId, fairyState)
		}, 2000) // Save maximum every 2 seconds

		// Watch for changes in fairy atoms
		const fairyCleanupFns: (() => void)[] = []
		agentsRef.current.forEach((agent) => {
			const cleanup = react(`${agent.id} state`, () => {
				agent.$fairyEntity.get()
				agent.$chatHistory.get()
				agent.$todoList.get()
				agent.$contextItems.get()
				updateFairyState()
			})
			fairyCleanupFns.push(cleanup)
		})

		const cleanupSharedTodoList = react('shared todo list', () => {
			$sharedTodoList.get()
			updateFairyState()
		})

		return () => {
			updateFairyState.flush()
			cleanupSharedTodoList()
			fairyCleanupFns.forEach((cleanup) => cleanup())
		}
	}, [app, fairyConfigs, fileId])

	// Save fairy configs to user preferences when they change
	useEffect(() => {
		if (!app || agentsRef.current.length === 0) return

		const updateFairyConfigs = throttle(() => {
			// Don't save if we're currently loading state
			if (isLoadingStateRef.current) return

			const configs: PersistedFairyConfigs = {}
			agentsRef.current.forEach((agent) => {
				configs[agent.id] = agent.$fairyConfig.get()
			})

			try {
				app.z.mutate.user.updateFairies({
					fairies: JSON.stringify(configs),
				})
			} catch (e) {
				console.error('Failed to save fairy configs:', e)
			}
		}, 500) // Save every 0.5 seconds

		// Watch for changes in fairy config atoms
		const cleanupFns: (() => void)[] = []
		agentsRef.current.forEach((agent) => {
			const cleanup = react(`${agent.id} config`, () => {
				agent.$fairyConfig.get()
				updateFairyConfigs()
			})
			cleanupFns.push(cleanup)
		})

		// Trigger an immediate save when fairyConfigs changes (handles additions/deletions)
		updateFairyConfigs()

		return () => {
			updateFairyConfigs.flush()
			cleanupFns.forEach((cleanup) => cleanup())
		}
	}, [app, fairyConfigs])

	return null
}
