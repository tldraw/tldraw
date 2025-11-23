import { useEditor, useValue } from 'tldraw'
import Fairy, { SelectedFairy } from './Fairy'
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

	const selectedAgents = useValue(
		'selected fairies',
		() => {
			return agents.filter((agent) => {
				const entity = agent.$fairyEntity.get()
				// Only show fairies that exist and are on the current page
				return (
					entity !== undefined &&
					entity.currentPageId === currentPageId &&
					agent.$fairyEntity.get()?.isSelected
				)
			})
		},
		[activeAgents]
	)

	return (
		<>
			{activeAgents.map((agent) => (
				<Fairy key={agent.id + '_fairy'} agent={agent} />
			))}
			{selectedAgents.map((agent) => (
				<SelectedFairy key={agent.id + '_selected'} agent={agent} />
			))}
		</>
	)
}
