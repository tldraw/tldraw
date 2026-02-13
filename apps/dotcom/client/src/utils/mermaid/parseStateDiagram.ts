/**
 * Parser for Mermaid state diagrams
 * Extracts states and transitions to create native tldraw shapes
 */

export interface StateDiagramState {
	id: string
	label: string
	isStart: boolean
	isEnd: boolean
}

export interface StateDiagramTransition {
	from: string
	to: string
	label?: string
}

export interface ParsedStateDiagram {
	states: StateDiagramState[]
	transitions: StateDiagramTransition[]
}

/**
 * Parse a Mermaid state diagram into states and transitions
 */
export function parseStateDiagram(code: string): ParsedStateDiagram | null {
	try {
		const lines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0) return null

		// Check for stateDiagram or stateDiagram-v2
		const firstLine = lines[0]
		if (!firstLine.match(/^stateDiagram(?:-v2)?$/)) return null

		const states: StateDiagramState[] = []
		const transitions: StateDiagramTransition[] = []
		const stateMap = new Map<string, StateDiagramState>()
		const stateAliases = new Map<string, string>() // Map aliases to IDs

		// Parse remaining lines
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]

			// Skip direction declarations
			if (line.match(/^direction\s+(LR|RL|TB|BT)/)) continue

			// Parse state alias definition: state "Long Name" as s1
			const aliasMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)/)
			if (aliasMatch) {
				const [, label, alias] = aliasMatch
				stateAliases.set(alias, alias)
				if (!stateMap.has(alias)) {
					const state: StateDiagramState = {
						id: alias,
						label: cleanLabel(label),
						isStart: false,
						isEnd: false,
					}
					states.push(state)
					stateMap.set(alias, state)
				} else {
					// Update label if state already exists
					stateMap.get(alias)!.label = cleanLabel(label)
				}
				continue
			}

			// Parse transitions: A --> B or [*] --> A or A --> [*]
			// Pattern handles optional labels: A --> B : transition label
			const transitionPattern = /^(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)(?:\s*:\s*(.+))?$/
			const transitionMatch = line.match(transitionPattern)

			if (transitionMatch) {
				const [, from, to, label] = transitionMatch

				// Create transition
				transitions.push({
					from: from === '[*]' ? 'start' : from,
					to: to === '[*]' ? 'end' : to,
					label: label?.trim(),
				})

				// Create states for from/to if not [*]
				if (from !== '[*]' && !stateMap.has(from)) {
					const state: StateDiagramState = {
						id: from,
						label: from,
						isStart: false,
						isEnd: false,
					}
					states.push(state)
					stateMap.set(from, state)
				}

				if (to !== '[*]' && !stateMap.has(to)) {
					const state: StateDiagramState = {
						id: to,
						label: to,
						isStart: false,
						isEnd: false,
					}
					states.push(state)
					stateMap.set(to, state)
				}

				// Mark start/end states
				if (from === '[*]' && to !== '[*]') {
					stateMap.get(to)!.isStart = true
				}
				if (to === '[*]' && from !== '[*]') {
					stateMap.get(from)!.isEnd = true
				}

				continue
			}

			// Parse standalone state definition: state A
			const stateMatch = line.match(/^state\s+(\w+)/)
			if (stateMatch) {
				const [, id] = stateMatch
				if (!stateMap.has(id)) {
					const state: StateDiagramState = {
						id,
						label: id,
						isStart: false,
						isEnd: false,
					}
					states.push(state)
					stateMap.set(id, state)
				}
			}
		}

		return { states, transitions }
	} catch (error) {
		return null
	}
}

/**
 * Clean label - remove quotes and extra whitespace
 */
function cleanLabel(label: string): string {
	let cleaned = label.trim()

	// Remove outer quotes
	if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
		cleaned = cleaned.slice(1, -1)
	} else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
		cleaned = cleaned.slice(1, -1)
	}

	return cleaned
}
