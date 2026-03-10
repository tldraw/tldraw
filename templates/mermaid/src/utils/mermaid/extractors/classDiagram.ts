import { parseClassDiagramAdvanced } from '../../parseClassDiagramAdvanced'
import { extractSvgText, getNodeBounds } from '../svgUtils'
import { DiagramLayout, EdgeLayout, NodeLayout } from '../types'

export function extractClassLayout(svgEl: Element, code: string): DiagramLayout {
	const ast = parseClassDiagramAdvanced(code)
	const nodes: NodeLayout[] = []
	const edges: EdgeLayout[] = []

	const classMap = new Map<string, any>()
	if (ast) {
		for (const cls of ast.classes) classMap.set(cls.name, cls)
	}

	// Class nodes: g elements with class="node" or g.classGroup
	const nodeEls = svgEl.querySelectorAll('g.node, g.classGroup')
	nodeEls.forEach((el) => {
		const bounds = getNodeBounds(el)

		// Try to get class name from element ID: Mermaid uses "classId-ClassName-N"
		const rawId = el.id || el.getAttribute('id') || ''
		const idMatch = rawId.match(/classId-(.+?)-\d+$/)
		const classNameFromId = idMatch ? idMatch[1] : null

		// Fall back to text extraction: extractSvgText returns space-joined text
		// Use label.includes() since split('\n') won't work on space-joined text
		const label = extractSvgText(el)

		// Match to AST by element ID first, then by finding class name in label
		const classData =
			(classNameFromId ? classMap.get(classNameFromId) : null) ??
			ast?.classes.find((c) => {
				// Exact ID match or class name appears as a word in the label
				const re = new RegExp(`(?:^|\\s)${c.name}(?:\\s|$)`)
				return re.test(label)
			})
		if (!classData) return

		// Build full label with class members
		const labelParts = [classData.name]
		if (classData.stereotype) {
			labelParts.unshift(`<<${classData.stereotype}>>`)
		}
		if (classData.properties.length > 0 || classData.methods.length > 0) {
			labelParts.push('---')
			for (const prop of classData.properties) {
				const typeStr = prop.type ? `${prop.type} ` : ''
				labelParts.push(`${prop.visibility}${typeStr}${prop.name}`)
			}
			for (const method of classData.methods) {
				const typeStr = method.type ? `${method.type} ` : ''
				labelParts.push(`${method.visibility}${typeStr}${method.name}`)
			}
		}

		nodes.push({
			id: classData.name,
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height,
			geoShape: 'rectangle',
			label: labelParts.join('\n'),
			meta: {
				diagramType: 'classDiagram',
				classData,
			},
		})
	})

	// Edges from AST
	if (ast) {
		for (let i = 0; i < ast.relationships.length; i++) {
			const rel = ast.relationships[i]
			edges.push({
				id: `rel-${i}`,
				from: rel.from,
				to: rel.to,
				label: rel.label ?? '',
				meta: {
					diagramType: 'classDiagram',
					relationshipData: rel,
				},
			})
		}
	}

	return { type: 'classDiagram', nodes, edges }
}
