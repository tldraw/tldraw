import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { TldrawFairyAgent } from './fairy-agent/agent/TldrawFairyAgent'
import { useTldrawFairyAgent } from './fairy-agent/agent/useTldrawFairyAgent'

export function FairyAppInner({ setAgents }: { setAgents(agents: TldrawFairyAgent[]): void }) {
	const FAIRY_ID = 'theOnlyFairy'
	const editor = useEditor()
	const agent = useTldrawFairyAgent(editor, FAIRY_ID)

	useEffect(() => {
		if (!editor || !agent) return
		setAgents([agent])
		;(window as any).agent = agent
	}, [agent, editor, setAgents])

	return null
}
