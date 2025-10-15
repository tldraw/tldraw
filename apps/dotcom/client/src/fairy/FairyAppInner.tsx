import { useCallback, useEffect } from 'react'
import { useEditor } from 'tldraw'
import { useTldrawUser } from '../tla/hooks/useUser'
import { TldrawFairyAgent } from './fairy-agent/agent/TldrawFairyAgent'
import { useTldrawFairyAgent } from './fairy-agent/agent/useTldrawFairyAgent'

export function FairyAppInner({ setAgents }: { setAgents(agents: TldrawFairyAgent[]): void }) {
	const FAIRY_ID = 'Huppy'
	const editor = useEditor()
	const user = useTldrawUser()

	const getToken = useCallback(async () => {
		if (!user) return undefined
		return await user.getToken()
	}, [user])

	const agent = useTldrawFairyAgent(editor, FAIRY_ID, getToken)

	useEffect(() => {
		if (!editor || !agent) return
		setAgents([agent])
		;(window as any).agent = agent
	}, [agent, editor, setAgents])

	return null
}
