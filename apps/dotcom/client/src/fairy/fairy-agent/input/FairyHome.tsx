import { useValue } from 'tldraw'
import { TldrawFairyAgent } from '../agent/TldrawFairyAgent'
import { FairyBasicInput } from './FairyBasicInput'

export function FairyHome({ agents }: { agents: TldrawFairyAgent[] }) {
	const toggleAgent = (agent: TldrawFairyAgent) => {
		agent.$fairy.update((fairy) => ({
			...fairy,
			isSelected: !fairy.isSelected,
		}))
	}

	return (
		<div className="fairy-home">
			{/* Stack of fairy rows (each row has input + square) */}
			<div className="fairy-home__stack">
				{agents.map((agent) => (
					<FairyRow key={agent.id} agent={agent} onToggle={() => toggleAgent(agent)} />
				))}
			</div>
		</div>
	)
}

function FairyRow({ agent, onToggle }: { agent: TldrawFairyAgent; onToggle(): void }) {
	const isOpen = useValue('fairy isSelected', () => agent.$fairy.get().isSelected, [agent])

	return (
		<div className="fairy-row">
			{/* Input appears on the left when open */}
			{isOpen && (
				<div className="fairy-row__input">
					<FairyBasicInput agent={agent} />
				</div>
			)}

			{/* Fairy square on the right */}
			<button
				onClick={(e) => {
					e.stopPropagation()
					onToggle()
				}}
				onMouseDown={(e) => {
					e.stopPropagation()
				}}
				className={`fairy-square ${isOpen ? 'fairy-square--selected' : ''}`}
				title={`Fairy ${agent.id}`}
			>
				🧚
			</button>
		</div>
	)
}
