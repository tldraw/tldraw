import type { FlowDB } from 'mermaid/dist/diagrams/flowchart/flowDb.d.ts'
import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import type { StateDB } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import { Editor } from 'tldraw'
import { createFlowchart } from './flowchart'
import { createMermaidSequenceDiagram } from './sequenceDiagram'
import { createStateDiagram } from './stateDiagram'

export class MermaidDiagramError extends Error {
	constructor(
		public diagramType: string,
		public type: string
	) {
		super(`mermaid diagram error: ${diagramType}`)
		this.name = 'MermaidDiagramError'
	}
}

/**
 * Parse mermaid text and create tldraw shapes for supported diagram types.
 * Throws {@link MermaidDiagramError} if the diagram type is not supported or rendering fails.
 */
export async function createMermaidDiagram(
	editor: Editor,
	text: string
): Promise<string | undefined> {
	const mermaid = (await import('mermaid')).default

	const parsedResult = await mermaid.parse(text, { suppressErrors: true })
	if (!parsedResult) {
		throw new MermaidDiagramError('not a mermaid diagram', 'parse')
	}

	try {
		const parsedSvg = (await mermaid.render(`mermaid-${Date.now()}`, text)).svg
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const diagramResult = await mermaid.mermaidAPI.getDiagramFromText(text)

		switch (parsedResult.diagramType) {
			case 'flowchart-v2': {
				const db = diagramResult.db as FlowDB
				const vertices = db.getVertices() as Map<string, FlowVertex>
				const edges = db.getEdges() as FlowEdge[]
				const subGraphs = db.getSubGraphs() as FlowSubGraph[]
				createFlowchart(editor, parsedSvg, vertices, edges, subGraphs)
				break
			}
			case 'sequence': {
				const db = diagramResult.db as SequenceDB
				const actors = db.getActors()
				const actorKeys = db.getActorKeys()
				const msgs = db.getMessages()
				createMermaidSequenceDiagram(editor, parsedSvg, actors, actorKeys, msgs)
				break
			}
			case 'state':
			case 'stateDiagram': {
				const db = diagramResult.db as StateDB
				const states = db.getStates()
				const relations = db.getRelations()
				createStateDiagram(editor, parsedSvg, states, relations)
				break
			}
			default:
				throw new MermaidDiagramError(parsedResult.diagramType, 'unsupported')
		}

		return parsedSvg
	} catch (e) {
		if (e instanceof MermaidDiagramError) throw e
		console.error(e)
		throw new MermaidDiagramError(parsedResult.diagramType, 'parse')
	}
}
