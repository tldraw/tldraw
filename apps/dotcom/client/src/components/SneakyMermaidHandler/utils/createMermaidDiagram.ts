import type { ParseResult } from 'mermaid'
import mermaid from 'mermaid'
import type { FlowDB } from 'mermaid/dist/diagrams/flowchart/flowDb.d.ts'
import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import type { StateDB } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import { Editor } from 'tldraw'
import { createMermaidFlowchart } from './flowchart'
import { createMermaidSequenceDiagram } from './sequenceDiagram'
import { createMermaidStateDiagram } from './stateDiagram'

export class UnsupportedMermaidDiagramError extends Error {
	constructor(public diagramType: string) {
		super(`Unsupported mermaid diagram type: ${diagramType}`)
		this.name = 'UnsupportedMermaidDiagramError'
	}
}

/**
 * Parse mermaid text and create tldraw shapes for supported diagram types.
 * Throws {@link UnsupportedMermaidDiagramError} if the diagram type is not natively supported.
 */
export async function createMermaidDiagram(editor: Editor, text: string): Promise<void> {
	const parseResult = (await mermaid.parse(text, {
		suppressErrors: true,
	})) as ParseResult
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	const diagramResult = await mermaid.mermaidAPI.getDiagramFromText(text)

	switch (parseResult.diagramType) {
		case 'flowchart-v2': {
			const db = diagramResult.db as FlowDB
			const vertices = db.getVertices() as Map<string, FlowVertex>
			const edges = db.getEdges() as FlowEdge[]
			const direction = db.getDirection()
			const subGraphs = db.getSubGraphs() as FlowSubGraph[]
			createMermaidFlowchart(editor, vertices, edges, direction, subGraphs)
			return
		}
		case 'sequence': {
			const db = diagramResult.db as SequenceDB
			const actors = db.getActors()
			const actorKeys = db.getActorKeys()
			const msgs = db.getMessages()
			createMermaidSequenceDiagram(editor, actors, actorKeys, msgs)
			return
		}
		case 'state':
		case 'stateDiagram': {
			const db = diagramResult.db as StateDB
			const states = db.getStates()
			const relations = db.getRelations()
			const direction = db.getDirection()
			createMermaidStateDiagram(editor, states, relations, direction)
			return
		}
		default:
			throw new UnsupportedMermaidDiagramError(parseResult.diagramType)
	}
}
