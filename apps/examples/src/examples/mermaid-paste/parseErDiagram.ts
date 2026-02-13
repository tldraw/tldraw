/**
 * Parser for Mermaid ER (Entity-Relationship) diagrams
 * Extracts entities and relationships to create native tldraw shapes
 */

export interface ErEntity {
	name: string
	attributes: string[]
}

export interface ErRelationship {
	from: string
	to: string
	fromCardinality: string // ||, }o, }|, o|, etc.
	toCardinality: string
	label?: string
	relType: string // identifying or non-identifying
}

export interface ParsedErDiagram {
	entities: ErEntity[]
	relationships: ErRelationship[]
}

/**
 * Parse a Mermaid ER diagram into entities and relationships
 */
export function parseErDiagram(code: string): ParsedErDiagram | null {
	try {
		const lines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0) return null

		// Check for erDiagram
		const firstLine = lines[0]
		if (!firstLine.match(/^erDiagram$/)) return null

		const entities: ErEntity[] = []
		const relationships: ErRelationship[] = []
		const entityMap = new Map<string, ErEntity>()

		let currentEntity: ErEntity | null = null

		// Parse remaining lines
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]

			// Parse relationship: CUSTOMER ||--o{ ORDER : places
			// Cardinality options: ||, |o, }o, }|, o|, o{, }{
			// Relationship types: -- (non-identifying), .. (identifying)
			const relPattern =
				/^(\w+)\s+((?:\|\||\|o|\}o|\}\||\{\||\|{|o\||\{o|o\{|\{\{))(-{2}|\.{2})((?:\|\||\|o|\}o|\}\||\{\||\|{|o\||\{o|o\{|\{\{))\s+(\w+)(?:\s*:\s*(.+))?$/
			const relMatch = line.match(relPattern)

			if (relMatch) {
				const [, from, fromCard, relType, toCard, to, label] = relMatch

				relationships.push({
					from,
					to,
					fromCardinality: fromCard,
					toCardinality: toCard,
					label: label?.trim(),
					relType: relType === '..' ? 'identifying' : 'non-identifying',
				})

				// Ensure entities exist
				if (!entityMap.has(from)) {
					const entity: ErEntity = { name: from, attributes: [] }
					entities.push(entity)
					entityMap.set(from, entity)
				}
				if (!entityMap.has(to)) {
					const entity: ErEntity = { name: to, attributes: [] }
					entities.push(entity)
					entityMap.set(to, entity)
				}

				currentEntity = null
				continue
			}

			// Parse entity definition start: CUSTOMER {
			const entityStartMatch = line.match(/^(\w+)\s*\{$/)
			if (entityStartMatch) {
				const [, name] = entityStartMatch
				if (!entityMap.has(name)) {
					currentEntity = { name, attributes: [] }
					entities.push(currentEntity)
					entityMap.set(name, currentEntity)
				} else {
					currentEntity = entityMap.get(name)!
				}
				continue
			}

			// Parse entity definition end: }
			if (line === '}') {
				currentEntity = null
				continue
			}

			// Parse attribute: string name
			if (currentEntity && line) {
				// Format: type name or type name PK/FK
				const attrMatch = line.match(/^(\w+)\s+(\w+)(?:\s+(PK|FK|PK,FK))?$/)
				if (attrMatch) {
					const [, type, name, key] = attrMatch
					const attrLabel = key ? `${name} (${key})` : name
					currentEntity.attributes.push(attrLabel)
				} else {
					// Fallback: just use the whole line
					currentEntity.attributes.push(line)
				}
			}
		}

		return { entities, relationships }
	} catch (error) {
		return null
	}
}
