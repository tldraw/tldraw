/**
 * Parser for Mermaid state diagrams
 * Extracts states and transitions to create native tldraw shapes
 */

export interface StateDiagramState {
	id: string
	label: string
	isStart: boolean
	isEnd: boolean
	/** Special pseudo-state type for choice/fork/join nodes */
	stateType?: 'choice' | 'fork' | 'join'
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
 * Parse a Mermaid state diagram into states and transitions.
 * Composite (nested) states are flattened — inner states and transitions are
 * lifted to the top level. The composite state itself is also created.
 */
export function parseStateDiagram(code: string): ParsedStateDiagram | null {
	try {
		const rawLines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (rawLines.length === 0) return null

		const firstLine = rawLines[0]
		if (!firstLine.match(/^stateDiagram(?:-v2)?$/)) return null

		const states: StateDiagramState[] = []
		const transitions: StateDiagramTransition[] = []
		const stateMap = new Map<string, StateDiagramState>()

		// Process all content lines (flatten nested composite states)
		parseLines(rawLines.slice(1), states, transitions, stateMap)

		return { states, transitions }
	} catch (error) {
		return null
	}
}

/**
 * Parse a block of state diagram lines recursively.
 * Composite states are flattened: we create the composite state node and then
 * recurse into its body, registering inner states/transitions at the same level.
 */
function parseLines(
	lines: string[],
	states: StateDiagramState[],
	transitions: StateDiagramTransition[],
	stateMap: Map<string, StateDiagramState>
): void {
	let i = 0

	while (i < lines.length) {
		const line = lines[i]

		// Skip direction declarations and concurrent-region dividers
		if (/^direction\s+(LR|RL|TB|BT)/.test(line) || line === '--') {
			i++
			continue
		}

		// Composite state block: state ID {
		const compositeMatch = line.match(/^state\s+(\w+)\s*\{/)
		if (compositeMatch) {
			const [, id] = compositeMatch
			ensureState(id, id, stateMap, states)

			// Collect inner lines until matching closing }
			const innerLines: string[] = []
			i++
			let depth = 1
			while (i < lines.length && depth > 0) {
				if (lines[i] === '{' || lines[i].endsWith('{')) depth++
				if (lines[i] === '}') {
					depth--
					if (depth === 0) {
						i++
						break
					}
				}
				innerLines.push(lines[i])
				i++
			}
			// Recursively parse inner content — states flatten to top level
			parseLines(innerLines, states, transitions, stateMap)
			continue
		}

		// State alias: state "Long Name" as id
		const aliasMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)/)
		if (aliasMatch) {
			const [, label, id] = aliasMatch
			ensureState(id, cleanLabel(label), stateMap, states)
			i++
			continue
		}

		// Special pseudo-state: state id <<choice>> / <<fork>> / <<join>>
		const pseudoMatch = line.match(/^state\s+(\w+)\s+<<(choice|fork|join)>>/)
		if (pseudoMatch) {
			const [, id, stateType] = pseudoMatch
			if (!stateMap.has(id)) {
				const state: StateDiagramState = {
					id,
					label: id,
					isStart: false,
					isEnd: false,
					stateType: stateType as StateDiagramState['stateType'],
				}
				states.push(state)
				stateMap.set(id, state)
			}
			i++
			continue
		}

		// Note syntax: note right of ID : text  — skip, decorative only
		if (/^note\s+(right of|left of)\s+\w+/.test(line)) {
			i++
			continue
		}

		// Transitions: A --> B or [*] --> A or A --> [*]
		// Optional label: A --> B : label text
		// Also supports guards written as labels: A --> B : [condition]
		const transitionPattern = /^(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)(?:\s*:\s*(.+))?$/
		const transitionMatch = line.match(transitionPattern)
		if (transitionMatch) {
			const [, from, to, label] = transitionMatch
			const fromId = from === '[*]' ? 'start' : from
			const toId = to === '[*]' ? 'end' : to

			transitions.push({ from: fromId, to: toId, label: label?.trim() })

			if (from !== '[*]') ensureState(fromId, fromId, stateMap, states)
			if (to !== '[*]') ensureState(toId, toId, stateMap, states)

			if (from === '[*]' && to !== '[*]' && stateMap.has(toId)) {
				stateMap.get(toId)!.isStart = true
			}
			if (to === '[*]' && from !== '[*]' && stateMap.has(fromId)) {
				stateMap.get(fromId)!.isEnd = true
			}

			i++
			continue
		}

		// Standalone state definition: state ID (no block)
		const stateMatch = line.match(/^state\s+(\w+)$/)
		if (stateMatch) {
			ensureState(stateMatch[1], stateMatch[1], stateMap, states)
			i++
			continue
		}

		i++
	}
}

function ensureState(
	id: string,
	label: string,
	stateMap: Map<string, StateDiagramState>,
	states: StateDiagramState[]
): void {
	if (!stateMap.has(id)) {
		const state: StateDiagramState = { id, label, isStart: false, isEnd: false }
		states.push(state)
		stateMap.set(id, state)
	}
}

function cleanLabel(label: string): string {
	let cleaned = label.trim()
	if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1)
	else if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1)
	return cleaned
}
