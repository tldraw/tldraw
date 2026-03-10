import { getDiagramType } from '../mermaidDetection'
import { extractClassLayout } from './extractors/classDiagram'
import { extractErLayout } from './extractors/erDiagram'
import { extractFlowchartLayout } from './extractors/flowchart'
import { extractSequenceLayout } from './extractors/sequence'
import { extractStateLayout } from './extractors/stateDiagram'
import { renderMermaidSvgString } from './render'
import { DiagramLayout } from './types'

export async function getMermaidLayout(code: string): Promise<DiagramLayout | null> {
	const diagramType = getDiagramType(code)
	if (!diagramType) return null

	const svgString = await renderMermaidSvgString(code)
	const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
	const svgEl = doc.querySelector('svg')
	if (!svgEl) return null

	switch (diagramType) {
		case 'flowchart':
			return extractFlowchartLayout(svgEl, code)
		case 'sequenceDiagram':
			return extractSequenceLayout(svgEl, code)
		case 'classDiagram':
			return extractClassLayout(svgEl, code)
		case 'stateDiagram':
			return extractStateLayout(svgEl, code)
		case 'erDiagram':
			return extractErLayout(svgEl, code)
		default:
			return null
	}
}
