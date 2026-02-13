/**
 * Parser for Mermaid class diagrams
 * Extracts classes and relationships to create native tldraw shapes
 */

export interface ClassMember {
	visibility: '+' | '-' | '#' | '~' | '' // public, private, protected, package
	name: string
	type?: string
	isMethod: boolean
}

export interface ClassDiagramClass {
	name: string
	stereotype?: string // <<interface>>, <<abstract>>, etc.
	members: ClassMember[]
}

export interface ClassRelationship {
	from: string
	to: string
	relType: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'dependency' | 'realization'
	label?: string
	fromMultiplicity?: string
	toMultiplicity?: string
}

export interface ParsedClassDiagram {
	classes: ClassDiagramClass[]
	relationships: ClassRelationship[]
}

/**
 * Parse a Mermaid class diagram into classes and relationships
 */
export function parseClassDiagram(code: string): ParsedClassDiagram | null {
	try {
		const lines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0) return null

		// Check for classDiagram
		const firstLine = lines[0]
		if (!firstLine.match(/^classDiagram$/)) return null

		const classes: ClassDiagramClass[] = []
		const relationships: ClassRelationship[] = []
		const classMap = new Map<string, ClassDiagramClass>()

		let currentClass: ClassDiagramClass | null = null

		// Parse remaining lines
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]

			// Parse relationships:
			// ClassA <|-- ClassB : Inheritance
			// ClassA *-- ClassB : Composition
			// ClassA o-- ClassB : Aggregation
			// ClassA --> ClassB : Association
			// ClassA ..> ClassB : Dependency
			// ClassA <|.. ClassB : Realization
			const relPattern =
				/^(\w+)\s+(".*?")?\s*(<\|--|<\|\.\.|\*--|o--|\.\.|--|-->|<--)\s+(".*?")?\s*(\w+)(?:\s*:\s*(.+))?$/
			const relMatch = line.match(relPattern)

			if (relMatch) {
				const [, from, fromMult, relSymbol, toMult, to, label] = relMatch

				let relType: ClassRelationship['relType'] = 'association'
				if (relSymbol === '<|--' || relSymbol === '--|>') relType = 'inheritance'
				else if (relSymbol === '<|..' || relSymbol === '..|>') relType = 'realization'
				else if (relSymbol === '*--' || relSymbol === '--*') relType = 'composition'
				else if (relSymbol === 'o--' || relSymbol === '--o') relType = 'aggregation'
				else if (relSymbol === '..' || relSymbol === '..>') relType = 'dependency'
				else if (relSymbol === '-->' || relSymbol === '<--' || relSymbol === '--')
					relType = 'association'

				relationships.push({
					from,
					to,
					relType,
					label: label?.trim(),
					fromMultiplicity: fromMult?.replace(/"/g, ''),
					toMultiplicity: toMult?.replace(/"/g, ''),
				})

				// Ensure classes exist
				if (!classMap.has(from)) {
					const cls: ClassDiagramClass = { name: from, members: [] }
					classes.push(cls)
					classMap.set(from, cls)
				}
				if (!classMap.has(to)) {
					const cls: ClassDiagramClass = { name: to, members: [] }
					classes.push(cls)
					classMap.set(to, cls)
				}

				currentClass = null
				continue
			}

			// Parse class definition with stereotype: class Animal <<interface>>
			const classStereotypeMatch = line.match(/^class\s+(\w+)\s+<<([^>]+)>>$/)
			if (classStereotypeMatch) {
				const [, name, stereotype] = classStereotypeMatch
				if (!classMap.has(name)) {
					currentClass = { name, stereotype, members: [] }
					classes.push(currentClass)
					classMap.set(name, currentClass)
				} else {
					currentClass = classMap.get(name)!
					currentClass.stereotype = stereotype
				}
				continue
			}

			// Parse class definition start: class Animal {
			const classStartMatch = line.match(/^class\s+(\w+)\s*\{$/)
			if (classStartMatch) {
				const [, name] = classStartMatch
				if (!classMap.has(name)) {
					currentClass = { name, members: [] }
					classes.push(currentClass)
					classMap.set(name, currentClass)
				} else {
					currentClass = classMap.get(name)!
				}
				continue
			}

			// Parse simple class definition: class Animal
			const simpleClassMatch = line.match(/^class\s+(\w+)$/)
			if (simpleClassMatch) {
				const [, name] = simpleClassMatch
				if (!classMap.has(name)) {
					const cls: ClassDiagramClass = { name, members: [] }
					classes.push(cls)
					classMap.set(name, cls)
				}
				currentClass = null
				continue
			}

			// Parse class definition end: }
			if (line === '}') {
				currentClass = null
				continue
			}

			// Parse member (inside class definition)
			if (currentClass) {
				// Format: +attribute : Type or +method(param) Type
				const memberMatch = line.match(/^([+\-#~])?([^:(]+)(\([^)]*\))?(?:\s*:\s*(.+))?$/)
				if (memberMatch) {
					const [, visibility, name, params, type] = memberMatch
					const isMethod = !!params

					currentClass.members.push({
						visibility: (visibility as ClassMember['visibility']) || '',
						name: name.trim(),
						type: type?.trim(),
						isMethod,
					})
				}
			}

			// Parse method definition: Animal : +eat(food)
			const methodMatch = line.match(/^(\w+)\s*:\s*([+\-#~])?([^(]+)\(([^)]*)\)(?:\s*(.+))?$/)
			if (methodMatch) {
				const [, className, visibility, methodName, , returnType] = methodMatch
				if (!classMap.has(className)) {
					const cls: ClassDiagramClass = { name: className, members: [] }
					classes.push(cls)
					classMap.set(className, cls)
				}
				classMap.get(className)!.members.push({
					visibility: (visibility as ClassMember['visibility']) || '',
					name: methodName.trim(),
					type: returnType?.trim(),
					isMethod: true,
				})
				continue
			}

			// Parse attribute definition: Animal : +name string
			const attrMatch = line.match(/^(\w+)\s*:\s*([+\-#~])?([^\s:]+)(?:\s+(.+))?$/)
			if (attrMatch) {
				const [, className, visibility, attrName, type] = attrMatch
				if (!classMap.has(className)) {
					const cls: ClassDiagramClass = { name: className, members: [] }
					classes.push(cls)
					classMap.set(className, cls)
				}
				classMap.get(className)!.members.push({
					visibility: (visibility as ClassMember['visibility']) || '',
					name: attrName.trim(),
					type: type?.trim(),
					isMethod: false,
				})
			}
		}

		return { classes, relationships }
	} catch (error) {
		return null
	}
}
