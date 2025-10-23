import { PersistedFairyState } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useRef } from 'react'
import { react, throttle, useEditor } from 'tldraw'
import { useMaybeApp } from '../tla/hooks/useAppState'
import { useTldrawUser } from '../tla/hooks/useUser'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { useFairyAgent } from './fairy-agent/agent/useFairyAgent'
import { FairyConfig } from './FairyConfig'

const FAIRY_1_CONFIG: FairyConfig = {
	name: 'Huppy',
	outfit: {
		body: 'plain',
		hat: 'pointy',
		wings: 'plain',
	},
	personality: 'intelligent but cold, calculating, and aloof',
	wand: 'god',
}

const FAIRY_2_CONFIG: FairyConfig = {
	name: 'Yppuh',
	outfit: {
		body: 'plain',
		hat: 'top',
		wings: 'plain',
	},
	personality: 'artistic, creative, and neurotic',
	wand: 'god',
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

	// TODO: we need to use stable/hard-coded id's for fairies (not random) so state persists across sessions
	const FAIRY_1_ID = 'fairy-1'
	const FAIRY_2_ID = 'fairy-2'

	const agent1 = useFairyAgent({ id: FAIRY_1_ID, fairyConfig: FAIRY_1_CONFIG, editor, getToken })
	const agent2 = useFairyAgent({ id: FAIRY_2_ID, fairyConfig: FAIRY_2_CONFIG, editor, getToken })

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
		if (!app || !agent1 || !agent2 || !fileId) return

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

				// Allow a tick for state to settle before allowing saves
				setTimeout(() => {
					isLoadingStateRef.current = false
				}, 100)
			} catch (e) {
				console.error('Failed to load fairy state:', e)
				isLoadingStateRef.current = false
			}
		}
	}, [app, agent1, agent2, fileId, FAIRY_1_ID, FAIRY_2_ID])

	// Save fairy state to backend periodically
	useEffect(() => {
		if (!app || !agent1 || !agent2 || !fileId) return

		const updateFairyState = throttle(() => {
			// Don't save if we're currently loading state
			if (isLoadingStateRef.current) return

			const fairyState: PersistedFairyState = {
				agents: {
					[FAIRY_1_ID]: agent1.serializeState(),
					[FAIRY_2_ID]: agent2.serializeState(),
				},
			}
			app.onFairyStateUpdate(fileId, fairyState)
		}, 5000) // Save every 5 seconds

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

		return () => {
			updateFairyState.flush()
			cleanup1()
			cleanup2()
		}
	}, [app, agent1, agent2, fileId, FAIRY_1_ID, FAIRY_2_ID])

	return null
}
