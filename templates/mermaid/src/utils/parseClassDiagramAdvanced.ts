/**
 * Advanced parser for Mermaid class diagrams with full metadata support
 */

export interface ClassMember {
	visibility: '+' | '-' | '#' | '~' | '' // public, private, protected, package, none
	type?: string
	name: string
	isStatic?: boolean
	isAbstract?: boolean
}

export interface ClassDefinition {
	name: string
	stereotype?: string // <<interface>>, <<abstract>>, etc.
	properties: ClassMember[]
	methods: ClassMember[]
	annotations?: string[]
}

export interface ClassRelationship {
	from: string
	to: string
	type: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'dependency' | 'realization'
	label?: string
	cardinality?: { from?: string; to?: string }
}

export interface Note {
	text: string
	attachedTo?: string // Class name if attached to a specific class
}

export interface ParsedClassDiagram {
	classes: ClassDefinition[]
	relationships: ClassRelationship[]
	notes: Note[]
}

/**
 * Parse a Mermaid class diagram into structured data
 */
export function parseClassDiagramAdvanced(code: string): ParsedClassDiagram | null {
	try {
		const lines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0 || !lines[0].startsWith('classDiagram')) {
			return null
		}

		const classes: ClassDefinition[] = []
		const relationships: ClassRelationship[] = []
		const notes: Note[] = []
		const classMap = new Map<string, ClassDefinition>()

		// Process lines
		let i = 1 // Skip first line (classDiagram)
		while (i < lines.length) {
			const line = lines[i]

			// Parse class definition block: class ClassName { ... }
			const classBlockMatch = line.match(/^class\s+(\w+)(?:\s*<<(.+?)>>)?\s*\{/)
			if (classBlockMatch) {
				const [, className, stereotype] = classBlockMatch
				const classDef: ClassDefinition = {
					name: className,
					stereotype: stereotype?.trim(),
					properties: [],
					methods: [],
				}

				// Parse class body
				i++
				while (i < lines.length && !lines[i].startsWith('}')) {
					const memberLine = lines[i].trim()
					if (memberLine) {
						const member = parseClassMember(memberLine)
						if (member) {
							// Distinguish between property and method
							if (memberLine.includes('(')) {
								classDef.methods.push(member)
							} else {
								classDef.properties.push(member)
							}
						}
					}
					i++
				}

				// Only add if class doesn't already exist (avoid duplicates from relationships)
				if (!classMap.has(className)) {
					classes.push(classDef)
					classMap.set(className, classDef)
				} else {
					// Update existing class with new properties/methods
					const existing = classMap.get(className)!
					existing.properties.push(...classDef.properties)
					existing.methods.push(...classDef.methods)
					if (classDef.stereotype) existing.stereotype = classDef.stereotype
				}
				i++ // Skip closing }
				continue
			}

			// Parse inline class definition: class ClassName
			const classInlineMatch = line.match(/^class\s+(\w+)(?:\s*<<(.+?)>>)?$/)
			if (classInlineMatch) {
				const [, className, stereotype] = classInlineMatch
				if (!classMap.has(className)) {
					const classDef: ClassDefinition = {
						name: className,
						stereotype: stereotype?.trim(),
						properties: [],
						methods: [],
					}
					classes.push(classDef)
					classMap.set(className, classDef)
				}
				i++
				continue
			}

			// Parse member addition: ClassName : +type attribute
			const memberAddMatch = line.match(/^(\w+)\s*:\s*(.+)$/)
			if (memberAddMatch) {
				const [, className, memberDef] = memberAddMatch
				const member = parseClassMember(memberDef)
				if (member && classMap.has(className)) {
					const classDef = classMap.get(className)!
					if (memberDef.includes('(')) {
						classDef.methods.push(member)
					} else {
						classDef.properties.push(member)
					}
				}
				i++
				continue
			}

			// Parse notes: note "text" or note for ClassName "text"
			const noteMatch = line.match(/^note\s+(?:for\s+(\w+)\s+)?"([^"]+)"/)
			if (noteMatch) {
				const [, className, text] = noteMatch
				notes.push({
					text: text.trim(),
					attachedTo: className,
				})
				i++
				continue
			}

			// Parse relationships
			const relationship = parseRelationship(line)
			if (relationship) {
				relationships.push(relationship)

				// Ensure both classes exist
				if (!classMap.has(relationship.from)) {
					const classDef: ClassDefinition = {
						name: relationship.from,
						properties: [],
						methods: [],
					}
					classes.push(classDef)
					classMap.set(relationship.from, classDef)
				}
				if (!classMap.has(relationship.to)) {
					const classDef: ClassDefinition = {
						name: relationship.to,
						properties: [],
						methods: [],
					}
					classes.push(classDef)
					classMap.set(relationship.to, classDef)
				}
			}

			i++
		}

		return { classes, relationships, notes }
	} catch (error) {
		console.error('Failed to parse class diagram:', error)
		return null
	}
}

/**
 * Parse a class member (property or method)
 */
function parseClassMember(line: string): ClassMember | null {
	// Format: [visibility][static/abstract]type name[(params)]
	// Examples:
	//   +String name
	//   -int age
	//   +getName()
	//   +static void main(String[] args)
	//   #abstract void doSomething()

	const trimmed = line.trim()
	if (!trimmed) return null

	// Extract visibility
	const visibilityMatch = trimmed.match(/^([+\-#~])/)
	const visibility = (visibilityMatch?.[1] as ClassMember['visibility']) || ''
	let rest = visibility ? trimmed.slice(1).trim() : trimmed

	// Extract modifiers
	const isStatic = rest.startsWith('static ')
	if (isStatic) rest = rest.slice(7).trim()

	const isAbstract = rest.startsWith('abstract ')
	if (isAbstract) rest = rest.slice(9).trim()

	// Check if it's a method (has parentheses)
	const methodMatch = rest.match(/^(\w+(?:\[\])?\s+)?(\w+)\s*\(([^)]*)\)/)
	if (methodMatch) {
		const [, returnType, name] = methodMatch
		return {
			visibility,
			type: returnType?.trim(),
			name: name + '()',
			isStatic,
			isAbstract,
		}
	}

	// It's a property
	const propertyMatch = rest.match(/^(\w+(?:\[\])?\s+)?(\w+)/)
	if (propertyMatch) {
		const [, type, name] = propertyMatch
		return {
			visibility,
			type: type?.trim(),
			name,
			isStatic,
			isAbstract,
		}
	}

	return null
}

/**
 * Parse a relationship between classes
 */
function parseRelationship(line: string): ClassRelationship | null {
	// Relationship patterns:
	// ClassA <|-- ClassB (inheritance)
	// ClassA *-- ClassB (composition)
	// ClassA o-- ClassB (aggregation)
	// ClassA --> ClassB (association)
	// ClassA ..> ClassB (dependency)
	// ClassA ..|> ClassB (realization)
	// ClassA "1" --> "many" ClassB (with cardinality)
	// ClassA --> ClassB : label

	// Extract label if present
	let label: string | undefined
	const labelMatch = line.match(/\s*:\s*(.+)$/)
	if (labelMatch) {
		label = labelMatch[1].trim()
		line = line.slice(0, labelMatch.index)
	}

	// Extract cardinality
	let cardinalityFrom: string | undefined
	let cardinalityTo: string | undefined
	const cardMatch = line.match(/(\w+)\s+"([^"]+)"\s+(.*?)\s+"([^"]+)"\s+(\w+)/)
	if (cardMatch) {
		const [, from, fromCard, arrow, toCard, to] = cardMatch
		cardinalityFrom = fromCard
		cardinalityTo = toCard
		line = `${from} ${arrow} ${to}`
	}

	// Parse relationship type
	let type: ClassRelationship['type'] = 'association'
	let from = ''
	let to = ''

	// Inheritance: <|--
	const inheritMatch = line.match(/(\w+)\s*<\|--\s*(\w+)/)
	if (inheritMatch) {
		;[, from, to] = inheritMatch
		type = 'inheritance'
		return { from: to, to: from, type, label, cardinality: { from: cardinalityFrom, to: cardinalityTo } }
	}

	// Realization: ..|>
	const realizeMatch = line.match(/(\w+)\s*\.\.\|>\s*(\w+)/)
	if (realizeMatch) {
		;[, from, to] = realizeMatch
		type = 'realization'
		return { from, to, type, label, cardinality: { from: cardinalityFrom, to: cardinalityTo } }
	}

	// Composition: *--
	const compMatch = line.match(/(\w+)\s*\*--\s*(\w+)/)
	if (compMatch) {
		;[, from, to] = compMatch
		type = 'composition'
		return { from, to, type, label, cardinality: { from: cardinalityFrom, to: cardinalityTo } }
	}

	// Aggregation: o--
	const aggMatch = line.match(/(\w+)\s*o--\s*(\w+)/)
	if (aggMatch) {
		;[, from, to] = aggMatch
		type = 'aggregation'
		return { from, to, type, label, cardinality: { from: cardinalityFrom, to: cardinalityTo } }
	}

	// Dependency: ..>
	const depMatch = line.match(/(\w+)\s*\.\.>\s*(\w+)/)
	if (depMatch) {
		;[, from, to] = depMatch
		type = 'dependency'
		return { from, to, type, label, cardinality: { from: cardinalityFrom, to: cardinalityTo } }
	}

	// Association: -->
	const assocMatch = line.match(/(\w+)\s*-->\s*(\w+)/)
	if (assocMatch) {
		;[, from, to] = assocMatch
		type = 'association'
		return { from, to, type, label, cardinality: { from: cardinalityFrom, to: cardinalityTo } }
	}

	return null
}
