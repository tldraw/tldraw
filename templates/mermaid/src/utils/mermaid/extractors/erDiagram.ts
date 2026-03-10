import { parseErDiagram } from '../../parseErDiagram'
import { extractSvgText, getNodeBounds } from '../svgUtils'
import { DiagramLayout, EdgeLayout, NodeLayout } from '../types'

export function extractErLayout(svgEl: Element, code: string): DiagramLayout {
	const ast = parseErDiagram(code)
	const nodes: NodeLayout[] = []
	const edges: EdgeLayout[] = []

	const entityMap = new Map<string, any>()
	if (ast) {
		for (const e of ast.entities) entityMap.set(e.name, e)
	}

	// ER entity boxes: try multiple selectors for Mermaid v10/v11 compatibility
	// Mermaid v11 uses g[id^="entity-"] or g[class~="entityBox"]
	const entityEls = svgEl.querySelectorAll(
		'g.er.entityBox, g[class~="entityBox"], g[id^="entity-"], g[id^="er-entity"]'
	)
	const processedNames = new Set<string>()

	entityEls.forEach((el) => {
		const bounds = getNodeBounds(el)

		// Try to get entity name from element ID: Mermaid may use "entity-EntityName" or similar
		const rawId = el.id || el.getAttribute('id') || ''
		const idMatch = rawId.match(/^(?:entity-|er-entity-)?(.+)$/)
		const nameFromId = idMatch ? idMatch[1] : null

		// Fall back to text extraction
		const rawLabel = extractSvgText(el)
		const nameFromText = rawLabel.split('\n')[0].split(' ')[0].trim()

		// Try ID-based match first, then text-based
		let entity = nameFromId ? entityMap.get(nameFromId) : null
		if (!entity && nameFromText) {
			entity = entityMap.get(nameFromText) ?? [...entityMap.values()].find((e) => rawLabel.startsWith(e.name))
		}
		if (!entity) return

		const entityName = entity.name
		if (processedNames.has(entityName)) return
		processedNames.add(entityName)

		// Build label: name + attributes
		const labelParts = [entity.name]
		if (entity.attributes.length > 0) {
			labelParts.push('---')
			labelParts.push(...entity.attributes)
		}

		nodes.push({
			id: entity.name,
			x: bounds.x,
			y: bounds.y,
			width: Math.max(bounds.width, 180),
			height: Math.max(bounds.height, 60),
			geoShape: 'rectangle',
			label: labelParts.join('\n'),
			meta: {
				diagramType: 'erDiagram',
				entityData: { name: entity.name, attributes: entity.attributes },
			},
		})
	})

	// Add any entities from the AST that weren't found in the SVG.
	// When some entities were found, position missing ones relative to the
	// existing bounding box. When none were found, use a simple grid.
	if (ast) {
		const missingEntities = ast.entities.filter((e) => !processedNames.has(e.name))
		if (missingEntities.length > 0) {
			let startX = 0
			let startY = 0

			if (nodes.length > 0) {
				// Place missing entities below the bounding box of found nodes
				let maxY = -Infinity
				let minX = Infinity
				for (const n of nodes) {
					if (n.y + n.height > maxY) maxY = n.y + n.height
					if (n.x < minX) minX = n.x
				}
				startX = minX
				startY = maxY + 40
			}

			const cols = Math.ceil(Math.sqrt(missingEntities.length))
			missingEntities.forEach((entity, i) => {
				const row = Math.floor(i / cols)
				const col = i % cols
				const labelParts = [
					entity.name,
					...(entity.attributes.length > 0 ? ['---', ...entity.attributes] : []),
				]
				nodes.push({
					id: entity.name,
					x: startX + col * 280,
					y: startY + row * 200,
					width: 200,
					height: 60 + entity.attributes.length * 22,
					geoShape: 'rectangle',
					label: labelParts.join('\n'),
					meta: {
						diagramType: 'erDiagram',
						entityData: { name: entity.name, attributes: entity.attributes },
					},
				})
			})
		}
	}

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
					diagramType: 'erDiagram',
					relationshipData: {
						from: rel.from,
						to: rel.to,
						fromCardinality: rel.fromCardinality,
						toCardinality: rel.toCardinality,
						label: rel.label ?? '',
						relType: rel.relType,
					},
				},
			})
		}
	}

	return { type: 'erDiagram', nodes, edges }
}
