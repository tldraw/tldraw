/**
 * Generate Mermaid ER diagram code from a ParsedErDiagram AST.
 */

import type { ParsedErDiagram } from '../parseErDiagram'

export function generateErCode(ast: ParsedErDiagram): string {
	const lines: string[] = ['erDiagram']

	// Entity definitions with attributes
	for (const entity of ast.entities) {
		if (entity.attributes.length > 0) {
			lines.push(`    ${entity.name} {`)
			for (const attr of entity.attributes) {
				lines.push(`        ${attr}`)
			}
			lines.push(`    }`)
		}
	}

	// Relationships
	for (const rel of ast.relationships) {
		const relType = rel.relType === 'identifying' ? '..' : '--'
		const label = rel.label ? ` : ${rel.label}` : ''
		lines.push(`    ${rel.from} ${rel.fromCardinality}${relType}${rel.toCardinality} ${rel.to}${label}`)
	}

	return lines.join('\n')
}
