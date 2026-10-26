import type { FlowchartModel, MindmapModel, SequenceModel, StateModel } from 'pele'
import { Editor } from 'tldraw'
import type { DiagramMermaidBlueprint } from './blueprint'
import { flowchartToBlueprint, parseFlowchartLayout } from './flowchartDiagram'
import {
	createLabelWidthMeasurer,
	createLayoutTextMeasurer,
	getLayoutFontSize,
} from './mermaidNodeCreateShape'
import { mindmapToBlueprint, parseMindmapLayout } from './mindmapDiagram'
import { loadPele, withMountedPeleSvg } from './peleDiagram'
import { BlueprintRenderingOptions, renderBlueprint } from './renderBlueprint'
import { parseSequenceLayout, sequenceToBlueprint } from './sequenceDiagram'
import { parseStateDiagramLayout, stateToBlueprint } from './stateDiagram'

// tldraw squeezes an arrow's label unless the arrow is 32 longer at each end (`getArrowLabelSize`),
// and only for arrows wider than tall, so only left-to-right layouts get the room.
const ARROW_LABEL_MARGIN = 64

function arrowLabelRoom(direction: string | undefined) {
	return { edgeLabelMargin: direction === 'LR' || direction === 'RL' ? ARROW_LABEL_MARGIN : 0 }
}

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

/** @public */
export interface MermaidDiagramOptions {
	/**
	 * Layout settings, keyed by diagram type the way Mermaid's config is (`flowchart`, `state`,
	 * `sequence`, …), passed to the layout as is; a diagram's own frontmatter config outranks them.
	 */
	mermaidConfig?: Record<string, any>
	blueprintRender?: BlueprintRenderingOptions
	onUnsupportedDiagram?(svg: string): Promise<void>
}

/**
 * Parse Mermaid text and create tldraw shapes for supported diagram types (flowchart, state,
 * sequence and mindmap). Other diagram types are rendered to SVG and handed to
 * `onUnsupportedDiagram`, or rejected when it isn't given.
 * Throws {@link MermaidDiagramError} if parsing fails.
 * @public
 */
export async function createMermaidDiagram(
	editor: Editor,
	text: string,
	options: MermaidDiagramOptions = {}
): Promise<void> {
	const pele = await loadPele()
	const type = pele.detectType(text)
	if (!type) throw new MermaidDiagramError('not a mermaid diagram', 'parse')
	let model
	try {
		await pele.load(type)
		model = pele.parse(text)
	} catch {
		throw new MermaidDiagramError(type, 'parse')
	}
	const config = options.mermaidConfig
	// Only built for the types converted to shapes: it reads tldraw's fonts off the editor.
	const layoutOptions = (opts?: { edgeLabelMargin?: number }) => ({
		fontSize: getLayoutFontSize(editor),
		measurer: createLayoutTextMeasurer(editor, opts),
		config,
	})

	let blueprint: DiagramMermaidBlueprint | undefined
	try {
		switch (type) {
			case 'flowchart': {
				const flowchart = model as FlowchartModel
				blueprint = await withMountedPeleSvg(
					text,
					layoutOptions(arrowLabelRoom(flowchart.direction)),
					(root) =>
						flowchartToBlueprint(
							parseFlowchartLayout(root, flowchart),
							flowchart.nodes,
							flowchart.edges,
							flowchart.subgraphs,
							flowchart.classes,
							flowchart.defaultEdgeStyle
						)
				)
				break
			}
			case 'state': {
				const state = model as StateModel
				blueprint = await withMountedPeleSvg(
					text,
					layoutOptions(arrowLabelRoom(state.direction)),
					(root) =>
						stateToBlueprint(
							parseStateDiagramLayout(root),
							state.states,
							state.relations,
							state.classes
						)
				)
				break
			}
			case 'mindmap': {
				const mindmap = model as MindmapModel
				blueprint = await withMountedPeleSvg(text, layoutOptions(), (root) =>
					mindmapToBlueprint(
						parseMindmapLayout(root, mindmap),
						mindmap,
						root,
						createLabelWidthMeasurer(editor)
					)
				)
				break
			}
			case 'sequence': {
				const sequence = model as SequenceModel
				blueprint = await withMountedPeleSvg(text, layoutOptions(), (root) =>
					sequenceToBlueprint(
						parseSequenceLayout(root, sequence),
						sequence.actors,
						[...sequence.actors.keys()],
						sequence.messages,
						sequence.createdActors,
						sequence.destroyedActors,
						createLabelWidthMeasurer(editor)
					)
				)
				break
			}
			default:
				if (!options.onUnsupportedDiagram) throw new MermaidDiagramError(type, 'unsupported')
				await options.onUnsupportedDiagram(pele.render(text, { config }).svg)
				return
		}
	} catch (e) {
		if (e instanceof MermaidDiagramError) throw e
		console.error(e)
		throw new MermaidDiagramError(type, 'parse')
	}

	if (blueprint) renderBlueprint(editor, blueprint, options.blueprintRender)
}
