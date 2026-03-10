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
 * Parse a Mermaid class diagram into structured data.
 * Supports: class blocks, inline members, relationships, notes, namespace blocks,
 * generic types written with ~ (e.g. List~Animal~), and <<stereotype>> annotations.
 */
export function parseClassDiagramAdvanced(code: string): ParsedClassDiagram | null {
	try {
		const lines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0 || !lines[0].startsWith('classDiagram')) return null

		const classes: ClassDefinition[] = []
		const relationships: ClassRelationship[] = []
		const notes: Note[] = []
		const classMap = new Map<string, ClassDefinition>()

		let i = 1 // Skip first line (classDiagram)

		while (i < lines.length) {
			const line = lines[i]

			// Namespace block: namespace Name { ... }
			// Flatten — parse the inner content as top-level
			if (/^namespace\s+\w+\s*\{/.test(line) || line === 'namespace {') {
				i++
				// Skip lines until closing } at the namespace level
				// But we still want to parse them, so just continue normally —
				// the closing `}` at namespace level is handled below
				continue
			}

			// Standalone `}` that isn't a class closing brace — namespace end, skip
			if (line === '}' && i > 0) {
				i++
				continue
			}

			// Class definition block: class ClassName { ... }
			// Also handles: class ClassName <<stereotype>> {
			const classBlockMatch = line.match(/^class\s+(\w+)(?:\s*<<(.+?)>>)?\s*\{/)
			if (classBlockMatch) {
				const [, className, stereotype] = classBlockMatch
				const classDef: ClassDefinition = {
					name: className,
					stereotype: stereotype?.trim(),
					properties: [],
					methods: [],
				}

				i++
				while (i < lines.length && !lines[i].startsWith('}')) {
					const memberLine = lines[i].trim()
					if (memberLine) {
						// <<annotation>> inside class body sets stereotype
						const annotationMatch = memberLine.match(/^<<(.+?)>>$/)
						if (annotationMatch) {
							classDef.stereotype = annotationMatch[1].trim()
						} else {
							const member = parseClassMember(memberLine)
							if (member) {
								if (memberLine.includes('(')) classDef.methods.push(member)
								else classDef.properties.push(member)
							}
						}
					}
					i++
				}

				if (!classMap.has(className)) {
					classes.push(classDef)
					classMap.set(className, classDef)
				} else {
					const existing = classMap.get(className)!
					existing.properties.push(...classDef.properties)
					existing.methods.push(...classDef.methods)
					if (classDef.stereotype) existing.stereotype = classDef.stereotype
				}
				i++ // Skip closing }
				continue
			}

			// Inline class: class ClassName  or  class ClassName <<stereotype>>
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
				} else if (stereotype) {
					classMap.get(className)!.stereotype = stereotype.trim()
				}
				i++
				continue
			}

			// Inline member addition: ClassName : +type attribute
			// But don't confuse with relationship lines that have : labels
			const memberAddMatch = line.match(/^(\w+)\s*:\s*(.+)$/)
			if (memberAddMatch) {
				const [, className, memberDef] = memberAddMatch
				// Only treat as member addition if class is already known
				if (classMap.has(className)) {
					const member = parseClassMember(memberDef)
					if (member) {
						const classDef = classMap.get(className)!
						if (memberDef.includes('(')) classDef.methods.push(member)
						else classDef.properties.push(member)
					}
					i++
					continue
				}
			}

			// Notes
			const noteMatch = line.match(/^note\s+(?:for\s+(\w+)\s+)?"([^"]+)"/)
			if (noteMatch) {
				const [, className, text] = noteMatch
				notes.push({ text: text.trim(), attachedTo: className })
				i++
				continue
			}

			// Relationships
			const relationship = parseRelationship(line)
			if (relationship) {
				relationships.push(relationship)
				for (const name of [relationship.from, relationship.to]) {
					if (!classMap.has(name)) {
						const classDef: ClassDefinition = { name, properties: [], methods: [] }
						classes.push(classDef)
						classMap.set(name, classDef)
					}
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
 * Normalise Mermaid's ~T~ generic syntax to <T> for display, and strip backticks/quotes.
 */
function normaliseType(raw: string): string {
	return raw.trim().replace(/~([^~]+)~/g, '<$1>')
}

/**
 * Parse a class member (property or method).
 * Handles visibility (+/-/#/~), static, abstract, generic types (~T~), and return types.
 */
function parseClassMember(line: string): ClassMember | null {
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

	// Normalise ~T~ generics
	rest = rest.replace(/~([^~]+)~/g, '<$1>')

	// Method: has parentheses
	const methodMatch = rest.match(
		/^([\w<>\[\],\s]+?\s+)?(\w+)\s*\(([^)]*)\)(?:\s*(?::\s*([\w<>\[\],\s]+))?)?/
	)
	if (methodMatch) {
		const [, returnType, name, , retType2] = methodMatch
		const type = normaliseType((retType2 || returnType || '').trim()) || undefined
		return { visibility, type, name: name + '()', isStatic, isAbstract }
	}

	// Property
	const propertyMatch = rest.match(/^([\w<>\[\],\s]+?\s+)?(\w+)$/)
	if (propertyMatch) {
		const [, type, name] = propertyMatch
		return { visibility, type: type ? normaliseType(type) : undefined, name, isStatic, isAbstract }
	}

	return null
}

/**
 * Parse a relationship between classes.
 * Supports all Mermaid class diagram arrow types and cardinality labels.
 */
function parseRelationship(line: string): ClassRelationship | null {
	// Extract label if present
	let label: string | undefined
	let workLine = line
	const labelMatch = workLine.match(/\s*:\s*(.+)$/)
	if (labelMatch) {
		label = labelMatch[1].trim()
		workLine = workLine.slice(0, labelMatch.index)
	}

	// Normalise ~T~ generics in class names (rare but possible)
	workLine = workLine.replace(/~[^~]+~/g, '')

	// Extract cardinality: ClassName "card" --> "card" ClassName
	let cardinalityFrom: string | undefined
	let cardinalityTo: string | undefined
	const cardMatch = workLine.match(/(\w+)\s+"([^"]+)"\s+(.*?)\s+"([^"]+)"\s+(\w+)/)
	if (cardMatch) {
		const [, from, fromCard, arrow, toCard, to] = cardMatch
		cardinalityFrom = fromCard
		cardinalityTo = toCard
		workLine = `${from} ${arrow} ${to}`
	}

	const cardinality =
		cardinalityFrom || cardinalityTo ? { from: cardinalityFrom, to: cardinalityTo } : undefined

	// Inheritance: ClassA <|-- ClassB  (B extends A)
	const inheritMatch = workLine.match(/(\w+)\s*<\|--\s*(\w+)/)
	if (inheritMatch) {
		const [, parent, child] = inheritMatch
		return { from: child, to: parent, type: 'inheritance', label, cardinality }
	}

	// Realization: ClassA ..|> ClassB  (A realizes/implements B)
	const realizeMatch = workLine.match(/(\w+)\s*\.\.\|>\s*(\w+)/)
	if (realizeMatch) {
		const [, from, to] = realizeMatch
		return { from, to, type: 'realization', label, cardinality }
	}

	// Composition: ClassA *-- ClassB
	const compMatch = workLine.match(/(\w+)\s*\*--\s*(\w+)/)
	if (compMatch) {
		const [, from, to] = compMatch
		return { from, to, type: 'composition', label, cardinality }
	}

	// Aggregation: ClassA o-- ClassB
	const aggMatch = workLine.match(/(\w+)\s*o--\s*(\w+)/)
	if (aggMatch) {
		const [, from, to] = aggMatch
		return { from, to, type: 'aggregation', label, cardinality }
	}

	// Dependency: ClassA ..> ClassB
	const depMatch = workLine.match(/(\w+)\s*\.\.>\s*(\w+)/)
	if (depMatch) {
		const [, from, to] = depMatch
		return { from, to, type: 'dependency', label, cardinality }
	}

	// Association: ClassA --> ClassB
	const assocMatch = workLine.match(/(\w+)\s*-->\s*(\w+)/)
	if (assocMatch) {
		const [, from, to] = assocMatch
		return { from, to, type: 'association', label, cardinality }
	}

	return null
}
