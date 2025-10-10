import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { TldrawFairyAgent } from './fairy-agent/agent/TldrawFairyAgent'
import { useTldrawAgent } from './fairy-agent/agent/useTldrawFairyAgent'

export function FairyAppInner({ setAgent }: { setAgent(agent: TldrawFairyAgent): void }) {
	const AGENT_ID = 'fairy'
	const editor = useEditor()
	const agent = useTldrawAgent(editor, AGENT_ID)

	useEffect(() => {
		if (!editor || !agent) return
		setAgent(agent)
		;(window as any).agent = agent
	}, [agent, editor, setAgent])

	return null
}
