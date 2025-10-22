import { useCallback, useEffect, useMemo } from 'react'
import { useEditor } from 'tldraw'
import { useTldrawUser } from '../tla/hooks/useUser'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { useFairyAgent } from './fairy-agent/agent/useFairyAgent'
import { FairyConfig } from './FairyConfig'

export function FairyApp({ setAgents }: { setAgents(agents: FairyAgent[]): void }) {
	const editor = useEditor()
	const user = useTldrawUser()

	const getToken = useCallback(async () => {
		if (!user) return undefined
		return await user.getToken()
	}, [user])

	// eslint-disable-next-line no-restricted-properties
	const FAIRY_1_ID = useMemo(() => crypto.randomUUID(), [])
	// eslint-disable-next-line no-restricted-properties
	const FAIRY_2_ID = useMemo(() => crypto.randomUUID(), [])

	const FAIRY_1_CONFIG: FairyConfig = useMemo(
		() => ({
			name: 'Huppy',
			outfit: {
				body: 'plain',
				hat: 'pointy',
				wings: 'plain',
			},
			personality: 'artistic, creative, and neurotic',
		}),
		[]
	)

	const FAIRY_2_CONFIG: FairyConfig = useMemo(
		() => ({
			name: 'Hoppy',
			outfit: {
				body: 'plain',
				hat: 'top',
				wings: 'plain',
			},
			personality: 'intelligent but cold, calculating, and aloof',
		}),
		[]
	)

	const agent1 = useFairyAgent({ id: FAIRY_1_ID, fairyConfig: FAIRY_1_CONFIG, editor, getToken })
	const agent2 = useFairyAgent({ id: FAIRY_2_ID, fairyConfig: FAIRY_2_CONFIG, editor, getToken })

	useEffect(() => {
		if (!editor || !agent1 || !agent2) return
		setAgents([agent1, agent2])
		;(window as any).agent = agent1
		;(window as any).agents = [agent1, agent2]
	}, [agent1, agent2, editor, setAgents])

	return null
}
