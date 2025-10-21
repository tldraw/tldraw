import { useCallback, useEffect } from 'react'
import { useEditor } from 'tldraw'
import { useTldrawUser } from '../tla/hooks/useUser'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { useFairyAgent } from './fairy-agent/agent/useFairyAgent'

export function FairyApp({ setAgents }: { setAgents(agents: FairyAgent[]): void }) {
	const FAIRY_ID = 'Huppy'
	const editor = useEditor()
	const user = useTldrawUser()

	const getToken = useCallback(async () => {
		if (!user) return undefined
		return await user.getToken()
	}, [user])

	const agent = useFairyAgent(editor, FAIRY_ID, getToken)

	useEffect(() => {
		if (!editor || !agent) return
		setAgents([agent])
		;(window as any).agent = agent
	}, [agent, editor, setAgents])

	return null
}
