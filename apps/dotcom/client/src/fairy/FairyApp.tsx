import { PersistedFairyState } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { react, throttle, useEditor } from 'tldraw'
import { useMaybeApp } from '../tla/hooks/useAppState'
import { useTldrawUser } from '../tla/hooks/useUser'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { useFairyAgent } from './fairy-agent/agent/useFairyAgent'
import { FairyConfig } from './FairyConfig'
import { $sharedTodoList } from './SharedTodoList'

const DEFAULT_FAIRY_1_CONFIG: FairyConfig = {
	name: 'Huppy',
	outfit: {
		body: 'plain',
		hat: 'pointy',
		wings: 'plain',
	},
	personality: 'intelligent but cold, calculating, and aloof',
	wand: 'god',
}

const DEFAULT_FAIRY_2_CONFIG: FairyConfig = {
	name: 'Yppuh',
	outfit: {
		body: 'plain',
		hat: 'top',
		wings: 'plain',
	},
	personality: 'artistic, creative, and neurotic',
	wand: 'god',
}

interface PersistedFairyConfigs {
	[fairyId: string]: FairyConfig
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
	const app = useMaybeApp()

	const getToken = useCallback(async () => {
		if (!user) return undefined
		return await user.getToken()
	}, [user])

	// Use stable IDs for fairies so state persists across sessions
	const FAIRY_1_ID = 'fairy-1'
	const FAIRY_2_ID = 'fairy-2'

	// Load fairy configs from user preferences, falling back to defaults
	const fairyConfigs = useMemo(() => {
		if (!app) return { [FAIRY_1_ID]: DEFAULT_FAIRY_1_CONFIG, [FAIRY_2_ID]: DEFAULT_FAIRY_2_CONFIG }

		try {
			const user = app.getUser()
			if (user.fairies) {
				const parsed: PersistedFairyConfigs = JSON.parse(user.fairies)
				return {
					[FAIRY_1_ID]: parsed[FAIRY_1_ID] || DEFAULT_FAIRY_1_CONFIG,
					[FAIRY_2_ID]: parsed[FAIRY_2_ID] || DEFAULT_FAIRY_2_CONFIG,
				}
			}
		} catch (e) {
			console.error('Failed to load fairy configs:', e)
		}

		return { [FAIRY_1_ID]: DEFAULT_FAIRY_1_CONFIG, [FAIRY_2_ID]: DEFAULT_FAIRY_2_CONFIG }
	}, [app])

	const agent1 = useFairyAgent({
		id: FAIRY_1_ID,
		fairyConfig: fairyConfigs[FAIRY_1_ID],
		editor,
		getToken,
	})
	const agent2 = useFairyAgent({
		id: FAIRY_2_ID,
		fairyConfig: fairyConfigs[FAIRY_2_ID],
		editor,
		getToken,
	})

	// Track whether we're currently loading state to prevent premature saves
	const isLoadingStateRef = useRef(false)

	useEffect(() => {
		if (!editor || !agent1 || !agent2) return
		setAgents([agent1, agent2])
		;(window as any).agent = agent1
		;(window as any).agents = [agent1, agent2]
	}, [agent1, agent2, editor, setAgents])

	// Load fairy state from backend when agents are created
	useEffect(() => {
		if (!app || !agent1 || !agent2 || !$sharedTodoList || !fileId) return

		const fileState = app.getFileState(fileId)
		if (fileState?.fairyState) {
			try {
				const fairyState: PersistedFairyState = JSON.parse(fileState.fairyState)

				// Mark that we're loading to prevent save watchers from firing
				isLoadingStateRef.current = true

				// Restore state for each agent
				if (fairyState.agents[FAIRY_1_ID]) {
					agent1.loadState(fairyState.agents[FAIRY_1_ID])
				}
				if (fairyState.agents[FAIRY_2_ID]) {
					agent2.loadState(fairyState.agents[FAIRY_2_ID])
				}

				if (fairyState.sharedTodoList) {
					$sharedTodoList.set(fairyState.sharedTodoList)
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
	}, [app, agent1, agent2, fileId])

	// Todo: Use FileStateUpdater for this
	// Save fairy state to backend periodically
	useEffect(() => {
		if (!app || !agent1 || !agent2 || !$sharedTodoList || !fileId) return

		const updateFairyState = throttle(() => {
			// Don't save if we're currently loading state
			if (isLoadingStateRef.current) return

			const fairyState: PersistedFairyState = {
				agents: {
					[FAIRY_1_ID]: agent1.serializeState(),
					[FAIRY_2_ID]: agent2.serializeState(),
				},
				sharedTodoList: $sharedTodoList.get(),
			}
			app.onFairyStateUpdate(fileId, fairyState)
		}, 2000) // Save maximum every 2 seconds

		// Watch for changes in fairy atoms
		const cleanup1 = react('fairy 1 state', () => {
			agent1.$fairyEntity.get()
			agent1.$chatHistory.get()
			agent1.$todoList.get()
			agent1.$contextItems.get()
			updateFairyState()
		})

		const cleanup2 = react('fairy 2 state', () => {
			agent2.$fairyEntity.get()
			agent2.$chatHistory.get()
			agent2.$todoList.get()
			agent2.$contextItems.get()
			updateFairyState()
		})

		const cleanupSharedTodoList = react('shared todo list', () => {
			$sharedTodoList.get()
			updateFairyState()
		})

		return () => {
			updateFairyState.flush()
			cleanup1()
			cleanup2()
			cleanupSharedTodoList()
		}
	}, [app, agent1, agent2, fileId])

	// Save fairy configs to user preferences when they change
	useEffect(() => {
		if (!app || !agent1 || !agent2) return

		const updateFairyConfigs = throttle(() => {
			// Don't save if we're currently loading state
			if (isLoadingStateRef.current) return

			const configs: PersistedFairyConfigs = {
				[FAIRY_1_ID]: agent1.$fairyConfig.get(),
				[FAIRY_2_ID]: agent2.$fairyConfig.get(),
			}

			try {
				const user = app.getUser()
				app.z.mutate.user.update({
					id: user.id,
					fairies: JSON.stringify(configs),
				})
			} catch (e) {
				console.error('Failed to save fairy configs:', e)
			}
		}, 500) // Save every 0.5 seconds

		// Watch for changes in fairy config atoms
		const cleanup1 = react('fairy 1 config', () => {
			agent1.$fairyConfig.get()
			updateFairyConfigs()
		})

		const cleanup2 = react('fairy 2 config', () => {
			agent2.$fairyConfig.get()
			updateFairyConfigs()
		})

		return () => {
			updateFairyConfigs.flush()
			cleanup1()
			cleanup2()
		}
	}, [app, agent1, agent2, FAIRY_1_ID, FAIRY_2_ID])

	return null
}
