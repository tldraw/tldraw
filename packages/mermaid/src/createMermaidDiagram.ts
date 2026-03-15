import mermaid, { MermaidConfig } from 'mermaid'
import type { FlowDB } from 'mermaid/dist/diagrams/flowchart/flowDb.d.ts'
import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import type { StateDB } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import { Editor } from 'tldraw'
import { flowchartToBlueprint } from './flowchartDiagram'
import { BlueprintRenderingOptions, renderBlueprint } from './renderBlueprint'
import { sequenceToBlueprint } from './sequenceDiagram'
import { stateToBlueprint } from './stateDiagram'

/** @public */
export class MermaidDiagramError extends Error {
	constructor(
		public diagramType: string,
		public type: 'parse' | 'unsupported'
	) {
		super(`mermaid diagram error: ${diagramType}`)
		this.name = 'MermaidDiagramError'
	}
}

// Inflate the font size so Mermaid's layout engine allocates larger nodes,
// compensating for tldraw's hand-drawn font being wider than Mermaid's default.
const FONT_INFLATE = 1.4

const MERMAID_CONFIG = {
	startOnLoad: false,
	flowchart: { nodeSpacing: 80, rankSpacing: 80, padding: 20 },
	state: { nodeSpacing: 80, rankSpacing: 80, padding: 20 },
	sequence: { actorMargin: 50, noteMargin: 20 },
	themeVariables: { fontSize: `${18 * FONT_INFLATE}px` },
}

/** @public */
export interface MermaidDiagramOptions {
	mermaidConfig?: MermaidConfig
	blueprintRender?: BlueprintRenderingOptions
	onUnsupportedDiagram?(svg: string): Promise<void>
}

/**
 * Parse mermaid text and create tldraw shapes for supported diagram types.
 * Returns the SVG string for supported diagrams, or `null` when the diagram type
 * is unsupported (after calling `onUnsupportedDiagram` if provided).
 * Throws {@link MermaidDiagramError} if parsing fails.
 * @public
 */
export async function createMermaidDiagram(
	editor: Editor,
	text: string,
	options: MermaidDiagramOptions = {}
): Promise<void> {
	mermaid.initialize({
		...MERMAID_CONFIG,
		...(options.mermaidConfig ?? {}),
	})

	const parsedResult = await mermaid.parse(text, { suppressErrors: true })

	if (!parsedResult) {
		throw new MermaidDiagramError('not a mermaid diagram', 'parse')
	}

	const offscreen = document.createElement('div')
	offscreen.style.position = 'absolute'
	offscreen.style.left = '-9999px'
	offscreen.style.top = '-9999px'
	offscreen.style.overflow = 'hidden'
	document.body.appendChild(offscreen)

	try {
		const parsedSvg = (await mermaid.render(`mermaid-${+new Date()}`, text, offscreen)).svg

		// Reuse the live SVG that mermaid.render() already mounted into the
		// offscreen container.  This avoids a second DOM mount and ensures
		// getBBox() works for every diagram type (state diagrams in particular
		// lack explicit dimension attributes and rely on live layout).
		let liveSvg = offscreen.querySelector('svg')

		if (!liveSvg) {
			offscreen.innerHTML = parsedSvg
			liveSvg = offscreen.querySelector('svg')
			if (!liveSvg) {
				throw new MermaidDiagramError(parsedResult.diagramType, 'parse')
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const diagramResult = await mermaid.mermaidAPI.getDiagramFromText(text)

		let blueprint
		switch (parsedResult.diagramType) {
			case 'flowchart-v2': {
				const db = diagramResult.db as FlowDB
				const vertices = db.getVertices() as Map<string, FlowVertex>
				const edges = db.getEdges() as FlowEdge[]
				const subGraphs = db.getSubGraphs() as FlowSubGraph[]
				const classes = db.getClasses()
				blueprint = flowchartToBlueprint(liveSvg, vertices, edges, subGraphs, classes)
				break
			}
			case 'sequence': {
				const db = diagramResult.db as SequenceDB
				blueprint = sequenceToBlueprint(
					liveSvg,
					db.getActors(),
					db.getActorKeys(),
					db.getMessages(),
					db.getCreatedActors(),
					db.getDestroyedActors()
				)
				break
			}
			case 'state':
			case 'stateDiagram': {
				const db = diagramResult.db as StateDB
				const states = db.getStates()
				const relations = db.getRelations()
				const classes = db.getClasses()
				blueprint = stateToBlueprint(liveSvg, states, relations, classes)
				break
			}
			default:
				await options.onUnsupportedDiagram?.(parsedSvg)
				break
		}

		if (blueprint) {
			renderBlueprint(editor, blueprint, options.blueprintRender)
		}
	} catch (e) {
		if (e instanceof MermaidDiagramError) throw e
		console.error(e)
		throw new MermaidDiagramError(parsedResult.diagramType, 'parse')
	} finally {
		offscreen.remove()
	}
}
