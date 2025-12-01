import { useEditor, useValue } from 'tldraw'
import { Fairy, SelectedFairy } from '../Fairy'
import { FairyApp } from '../fairy-app/FairyApp'

export function Fairies({ fairyApp }: { fairyApp: FairyApp }) {
	const editor = useEditor()

	const agents = useValue('fairy-agents', () => fairyApp?.agents.getAgents() ?? [], [fairyApp])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])

	// Reactively filter fairies based on current page and each fairy's currentPageId
	const activeAgents = useValue(
		'active fairies on page',
		() => {
			return agents.filter((agent) => {
				const entity = agent.getEntity()
				// Only show fairies that exist and are on the current page
				return (
					entity !== undefined && entity.currentPageId === currentPageId && !agent.mode.isSleeping()
				)
			})
		},
		[agents, currentPageId]
	)

	const selectedAgents = useValue(
		'selected fairies',
		() => {
			return agents.filter((agent) => {
				const entity = agent.getEntity()
				// Only show fairies that exist and are on the current page
				return (
					entity !== undefined &&
					entity.currentPageId === currentPageId &&
					entity.isSelected &&
					!agent.mode.isSleeping()
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
