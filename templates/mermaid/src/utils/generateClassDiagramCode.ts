/**
 * Generate Mermaid class diagram code from structured data
 */

import type { ClassDefinition, ClassMember, ClassRelationship } from './parseClassDiagramAdvanced'

export function generateClassDiagramCode(
	classes: ClassDefinition[],
	relationships: ClassRelationship[]
): string {
	const lines: string[] = ['classDiagram']

	// Generate class definitions
	for (const classDef of classes) {
		// Add class declaration with stereotype if present
		const stereotype = classDef.stereotype ? ` <<${classDef.stereotype}>>` : ''
		lines.push(`    class ${classDef.name}${stereotype} {`)

		// Add properties
		for (const prop of classDef.properties) {
			lines.push(`        ${formatClassMember(prop)}`)
		}

		// Add methods
		for (const method of classDef.methods) {
			lines.push(`        ${formatClassMember(method)}`)
		}

		lines.push('    }')
	}

	// Generate relationships
	for (const rel of relationships) {
		const label = rel.label ? ` : ${rel.label}` : ''

		// Inheritance: Mermaid syntax is  Parent <|-- Child
		// Our data stores { from: Child, to: Parent }, so we swap for output
		if (rel.type === 'inheritance') {
			const card = rel.cardinality
				? ` "${rel.cardinality.to || ''}" <|-- "${rel.cardinality.from || ''}"`
				: ' <|--'
			lines.push(`    ${rel.to}${card} ${rel.from}${label}`)
			continue
		}

		const arrow = getRelationshipArrow(rel.type)
		const card = rel.cardinality
			? ` "${rel.cardinality.from || ''}" ${arrow} "${rel.cardinality.to || ''}"`
			: ` ${arrow}`

		lines.push(`    ${rel.from}${card} ${rel.to}${label}`)
	}

	return lines.join('\n')
}

/**
 * Convert a display type (using <T>) back to Mermaid's ~T~ generic syntax
 */
function toMermaidType(type: string): string {
	return type.replace(/<([^>]+)>/g, '~$1~')
}

/**
 * Format a class member (property or method)
 */
function formatClassMember(member: ClassMember): string {
	let result = member.visibility || ''

	if (member.isStatic) result += 'static '
	if (member.isAbstract) result += 'abstract '

	if (member.type) result += `${toMermaidType(member.type)} `

	result += member.name

	return result
}

/**
 * Get the arrow syntax for a relationship type
 */
function getRelationshipArrow(type: ClassRelationship['type']): string {
	switch (type) {
		case 'inheritance':
			return '<|--'
		case 'composition':
			return '*--'
		case 'aggregation':
			return 'o--'
		case 'association':
			return '-->'
		case 'dependency':
			return '..>'
		case 'realization':
			return '..|>'
		default:
			return '-->'
	}
}
