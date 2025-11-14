import { useEditor, useValue } from 'tldraw'
import Fairy from './Fairy'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function Fairies({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])

	// Reactively filter fairies based on current page and each fairy's currentPageId
	const activeAgents = useValue(
		'active fairies on page',
		() => {
			return agents.filter((agent) => {
				const entity = agent.$fairyEntity.get()
				// Only show fairies that exist and are on the current page
				return entity !== undefined && entity.currentPageId === currentPageId
			})
		},
		[agents, currentPageId]
	)

	return (
		<>
			{activeAgents.map((agent, i) => (
				<Fairy key={i} agent={agent} />
			))}
		</>
	)
}
