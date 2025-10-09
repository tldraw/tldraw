import { useEffect } from 'react'
import { Atom, useEditor } from 'tldraw'
import { TldrawFairyAgent } from './fairy-agent/agent/TldrawAgent'
import { useTldrawAgent } from './fairy-agent/agent/useTldrawAgent'
import { FairyEntity } from '@tldraw/dotcom-shared'

export function FairyAppInner({ setAgent, $fairy }: { setAgent(agent: TldrawFairyAgent): void, $fairy: Atom<FairyEntity | undefined> }) {
	const AGENT_ID = 'fairy'
	const editor = useEditor()
	const agent = useTldrawAgent(editor, AGENT_ID, $fairy)

	useEffect(() => {
		if (!editor || !agent) return
		setAgent(agent)
		;(window as any).agent = agent
	}, [agent, editor, setAgent])

	return null
}
