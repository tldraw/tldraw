import { TLShape, TLShapeId, Tldraw } from '@tldraw/tldraw'
import console from 'console'
import { useEffect } from 'react'
import { AgentCursor } from './AgentCursor'
import { useAgent } from './useAgent'

export function AgentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="agent-example">
				<MyAgent />
			</Tldraw>
		</div>
	)
}

// This agent is an autonomous "virtual collaborator". For this demo, we're not doing anything too
// fancy. When you draw two geo shapes, the agent will draw an arrow between them.
//
// In a real-world scenario, you might instead have your agent be powered by an AI model that acts
// as a sort of canvas co-pilot or works with the user as an assistant.
export function MyAgent() {
	const _agent = useAgent()

	useEffect(() => {
		if (!_agent) return
		const agent = _agent
		let prevShapeId: TLShapeId | null = null

		async function drawArrowToShape(shapeId: TLShapeId) {
			console.log('drawArrowToShape', shapeId)
			const shape = agent.hostEditor.getShape(shapeId)

			// only draw arrows between geo shapes
			if (!shape) return

			const prevShape = prevShapeId ? agent.hostEditor.getShape(prevShapeId) : null

			// the prev shape is the start of the arrow. if we don't have one, we'll draw an arrow
			// to the *next* shape.
			if (!prevShape) {
				prevShapeId = shape.id
				return
			}

			// make sure we have bounds for both shapes
			const startBounds = agent.hostEditor.getShapePageBounds(prevShape)
			const endBounds = agent.hostEditor.getShapePageBounds(shape)
			if (!startBounds || !endBounds) return

			// draw an arrow between centers the two shapes!
			await agent
				.setCurrentTool('arrow')
				.pointerDown(startBounds.center)
				.pointerMove(endBounds.center)
				.pointerUp()
		}

		const stateByShapeId = new Map<TLShapeId, { timeout: Timeout } | 'drawn'>()
		// debounce the arrow drawing. we'll only draw an arrow if the user hasn't touched the shape involved for 1 second.
		function requestArrowToShape(shape: TLShape) {
			if (shape.type !== 'geo') return

			console.log('requestArrowToShape', shape.id)
			const state = stateByShapeId.get(shape.id)
			if (state === 'drawn') return

			if (state) {
				clearTimeout(state.timeout)
			}

			stateByShapeId.set(shape.id, {
				timeout: setTimeout(() => {
					stateByShapeId.set(shape.id, 'drawn')
					drawArrowToShape(shape.id)
				}, 1000),
			})
		}

		const removeAfterCreateHandler = agent.hostEditor.sideEffects.registerAfterCreateHandler(
			'shape',
			requestArrowToShape
		)
		const removeAfterChangeHandler = agent.hostEditor.sideEffects.registerAfterChangeHandler(
			'shape',
			requestArrowToShape
		)

		return () => {
			removeAfterCreateHandler()
			removeAfterChangeHandler()
			for (const state of stateByShapeId.values()) {
				if (state !== 'drawn') {
					clearTimeout(state.timeout)
				}
			}
		}
	}, [_agent])

	return _agent && <AgentCursor agent={_agent} />
}

type Timeout = ReturnType<typeof setTimeout>
