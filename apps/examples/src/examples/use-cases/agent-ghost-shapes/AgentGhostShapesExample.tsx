import { useCallback, useRef, useState } from 'react'
import { TLComponents, Tldraw, TldrawUiButton, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './agent-ghost-shapes.css'
import { describeAction } from './actions'
import { AgentActionStream, mockStream } from './agentStream'
import { GhostLayer } from './ghostRenderers'
import { acceptAll, applyActionToStage, clearProposals, proposals$, rejectAll } from './proposals'
import { UIComponentShapeUtil } from './UIComponentShape'

// Render proposed agent changes as ghost shapes on the canvas.
//
// This fuses two ideas:
//   - An ephemeral on-canvas overlay: suggestions live in a local atom (never in
//     the document store), are rendered through the `OnTheCanvas` slot, and become
//     real shapes only when accepted.
//   - The tldraw agent starter kit: the agent streams structured *actions*
//     (create / update / delete) which are applied through an action registry.
//
// Here, the agent's actions are applied to a STAGING layer instead of the
// editor. Each proposal is a ghost until you accept it — at which point it (and
// only it) becomes a real, synced, persisted shape.

// Swap this for `realStream` (see agentStream.ts) to drive ghosts from a real
// model via your own backend.
const driver: AgentActionStream = mockStream

const components: TLComponents = {
	OnTheCanvas: GhostLayer,
	TopPanel: PromptBar,
}

// The agent can propose these custom UI-component shapes; register the util so
// accepted proposals render as real, interactive React components on the canvas.
const shapeUtils = [UIComponentShapeUtil]

export default function AgentGhostShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="agent-ghost-shapes"
				shapeUtils={shapeUtils}
				components={components}
				// Ghosts are ephemeral; never restore them when the document loads.
				onMount={() => clearProposals()}
			/>
		</div>
	)
}

function PromptBar() {
	const editor = useEditor()
	const [input, setInput] = useState('')
	const [status, setStatus] = useState<string | null>(null)
	const [running, setRunning] = useState(false)
	const runId = useRef(0)
	const count = useValue('count', () => proposals$.get().length, [])

	const run = useCallback(
		async (message: string) => {
			const id = ++runId.current
			setRunning(true)
			setStatus('Thinking…')
			try {
				for await (const action of driver.stream(message, editor)) {
					if (runId.current !== id) return // a newer run superseded this one
					setStatus(describeAction(action))
					applyActionToStage(action)
				}
				setStatus(null)
			} catch (error) {
				setStatus(error instanceof Error ? error.message : 'Something went wrong')
			} finally {
				if (runId.current === id) setRunning(false)
			}
		},
		[editor]
	)

	return (
		<div className="aga-panel">
			<div className="aga-row">
				<input
					className="aga-input"
					value={input}
					placeholder="Ask the agent… (try “login screen”, “flowchart”, “tidy up”)"
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && input.trim()) run(input.trim())
					}}
				/>
				<TldrawUiButton
					type="normal"
					disabled={!input.trim() || running}
					onClick={() => run(input.trim())}
				>
					Send
				</TldrawUiButton>
			</div>

			<div className="aga-row">
				<TldrawUiButton type="low" disabled={running} onClick={() => run('login screen')}>
					▶ Run demo
				</TldrawUiButton>
				<span className="aga-status">
					{status
						? status
						: `${count} proposed change${count === 1 ? '' : 's'} (staged, not in the document)`}
				</span>
				<TldrawUiButton type="normal" disabled={count === 0} onClick={() => acceptAll(editor)}>
					Accept all
				</TldrawUiButton>
				<TldrawUiButton type="low" disabled={count === 0} onClick={() => rejectAll()}>
					Reject all
				</TldrawUiButton>
			</div>
		</div>
	)
}
