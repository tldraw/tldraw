import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { TldrawAgent } from './fairy-agent/agent/TldrawAgent'
import { useTldrawAgent } from './fairy-agent/agent/useTldrawAgent'

export function FairyAppInner({ setAgent }: { setAgent(agent: TldrawAgent): void }) {
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
