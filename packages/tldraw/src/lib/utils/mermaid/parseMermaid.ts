// Inlined mermaid parsers from @statelyai/graph v0.4.0
// Only the fromMermaid* parsing functions and their dependencies are included.
// The toMermaid* serializers, converters, and graph algorithms are not needed.

// ─── Base types ──────────────────────────────────────────────────────────────

export interface GraphNode<TNodeData = any> {
	type: 'node'
	id: string
	parentId?: string | null
	initialNodeId?: string | null
	label: string
	data: TNodeData
	x?: number
	y?: number
	width?: number
	height?: number
	shape?: string
	color?: string
	style?: Record<string, string | number>
}

export interface GraphEdge<TEdgeData = any> {
	type: 'edge'
	id: string
	sourceId: string
	targetId: string
	label: string
	data: TEdgeData
	x?: number
	y?: number
	width?: number
	height?: number
	color?: string
}

export interface Graph<TNodeData = any, TEdgeData = any, TGraphData = any> {
	id: string
	type: 'directed' | 'undirected'
	initialNodeId: string | null
	nodes: GraphNode<TNodeData>[]
	edges: GraphEdge<TEdgeData>[]
	data: TGraphData
	direction?: 'up' | 'down' | 'left' | 'right'
	style?: Record<string, string | number>
}

// ─── Diagram-specific data types ─────────────────────────────────────────────

export interface FlowchartNodeData {
	classes?: string[]
	link?: string
	tooltip?: string
}

export interface FlowchartEdgeData {
	stroke: 'normal' | 'dotted' | 'thick'
	arrowType: 'arrow' | 'none'
	endMarker?: 'arrow' | 'circle' | 'cross'
	startMarker?: 'arrow' | 'circle' | 'cross'
	bidirectional?: boolean
	styleIndex?: number
}

export interface FlowchartGraphData {
	diagramType: 'flowchart'
	classDefs?: Record<string, Record<string, string>>
}

export type FlowchartGraph = Graph<FlowchartNodeData, FlowchartEdgeData, FlowchartGraphData>

export interface SequenceNodeData {
	actorType: 'participant' | 'actor'
	alias?: string
	created?: boolean
	destroyed?: boolean
}

export interface SequenceEdgeData {
	kind: 'message' | 'activation' | 'deactivation'
	stroke?: 'solid' | 'dotted'
	arrowType?: 'filled' | 'open' | 'cross' | 'async'
	bidirectional?: boolean
	sequenceNumber?: number
}

export type SequenceBlock =
	| { type: 'loop'; label: string; edgeIds: string[] }
	| { type: 'alt'; label: string; branches: { label?: string; edgeIds: string[] }[] }
	| { type: 'opt'; label: string; edgeIds: string[] }
	| { type: 'par'; branches: { label: string; edgeIds: string[] }[] }
	| {
			type: 'critical'
			label: string
			edgeIds: string[]
			options?: { label: string; edgeIds: string[] }[]
	  }
	| { type: 'break'; label: string; edgeIds: string[] }
	| { type: 'rect'; color: string; edgeIds: string[] }

export interface SequenceGraphData {
	diagramType: 'sequence'
	autonumber?: boolean
	blocks?: SequenceBlock[]
}

export type SequenceGraph = Graph<SequenceNodeData, SequenceEdgeData, SequenceGraphData>

export interface StateNodeData {
	description?: string
	stateType?: 'choice' | 'fork' | 'join'
	notes?: Array<{ position: 'left' | 'right'; text: string }>
	isStart?: boolean
	isEnd?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StateEdgeData {}

export interface StateGraphData {
	diagramType: 'stateDiagram'
}

export type StateGraph = Graph<StateNodeData, StateEdgeData, StateGraphData>

export interface ClassNodeData {
	members?: Array<{
		visibility: '+' | '-' | '#' | '~'
		name: string
		type?: string
		isMethod: boolean
	}>
	annotation?: string
	genericType?: string
}

export interface ClassEdgeData {
	relationType:
		| 'inheritance'
		| 'composition'
		| 'aggregation'
		| 'association'
		| 'dependency'
		| 'realization'
		| 'link'
		| 'dashed'
	sourceCardinality?: string
	targetCardinality?: string
}

export interface ClassGraphData {
	diagramType: 'classDiagram'
}

export type ClassGraph = Graph<ClassNodeData, ClassEdgeData, ClassGraphData>

export interface ERNodeData {
	attributes?: Array<{
		type: string
		name: string
		key?: 'PK' | 'FK' | 'UK'
		comment?: string
	}>
}

export interface EREdgeData {
	sourceCardinality: 'one' | 'zero-or-one' | 'zero-or-more' | 'one-or-more'
	targetCardinality: 'one' | 'zero-or-one' | 'zero-or-more' | 'one-or-more'
	identifying: boolean
}

export interface ERGraphData {
	diagramType: 'erDiagram'
}

export type ERGraph = Graph<ERNodeData, EREdgeData, ERGraphData>

export interface BlockNodeData {
	span?: number
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockEdgeData {}

export interface BlockGraphData {
	diagramType: 'block'
	columns?: number
}

export type BlockGraph = Graph<BlockNodeData, BlockEdgeData, BlockGraphData>

// ─── Shared utilities ────────────────────────────────────────────────────────

const MERMAID_TO_DIRECTION: Record<string, 'up' | 'down' | 'left' | 'right'> = {
	TB: 'down',
	TD: 'down',
	BT: 'up',
	LR: 'right',
	RL: 'left',
}

function unescapeMermaidLabel(s: string): string {
	return s
		.replace(/#quot;/g, '"')
		.replace(/#59;/g, ';')
		.replace(/#35;/g, '#')
}

function generateEdgeId(sourceId: string, targetId: string, index: number): string {
	return `${sourceId}-${targetId}-${index}`
}

function stripComments(input: string): string {
	return input
		.split('\n')
		.map((line) => {
			const idx = line.indexOf('%%')
			if (idx === -1) return line
			if ((line.slice(0, idx).match(/"/g) || []).length % 2 !== 0) return line
			return line.slice(0, idx)
		})
		.join('\n')
}

function stripDirectives(input: string): { directives: Record<string, unknown>; cleaned: string } {
	const directives: Record<string, unknown> = {}
	return {
		directives,
		cleaned: input.replace(
			/%%\{[\s]*init[\s]*:[\s]*(.*?)[\s]*\}%%/gs,
			(_match: string, json: string) => {
				try {
					Object.assign(directives, JSON.parse(`{${json}}`))
				} catch {
					// ignore malformed directives
				}
				return ''
			}
		),
	}
}

function prepareLines(input: string): {
	lines: string[]
	directives: Record<string, unknown>
} {
	const { directives, cleaned } = stripDirectives(input)
	return {
		lines: stripComments(cleaned)
			.split('\n')
			.map((l) => l.trimEnd())
			.filter((l) => l.trim() !== ''),
		directives,
	}
}

function validateInput(input: string, prefix: string): void {
	if (typeof input !== 'string') throw new Error(`${prefix}: expected a string`)
	if (!input.trim()) throw new Error(`${prefix}: input is empty`)
}

// ─── Sequence diagram parser ─────────────────────────────────────────────────

const ARROW_PATTERNS: Array<
	[string, { stroke: 'solid' | 'dotted'; arrowType: string; bidirectional: boolean }]
> = [
	['<<-->>', { stroke: 'dotted', arrowType: 'filled', bidirectional: true }],
	['<<->>', { stroke: 'solid', arrowType: 'filled', bidirectional: true }],
	['-->>', { stroke: 'dotted', arrowType: 'filled', bidirectional: false }],
	['-->', { stroke: 'dotted', arrowType: 'open', bidirectional: false }],
	['--x', { stroke: 'dotted', arrowType: 'cross', bidirectional: false }],
	['--)', { stroke: 'dotted', arrowType: 'async', bidirectional: false }],
	['->>', { stroke: 'solid', arrowType: 'filled', bidirectional: false }],
	['->', { stroke: 'solid', arrowType: 'open', bidirectional: false }],
	['-x', { stroke: 'solid', arrowType: 'cross', bidirectional: false }],
	['-)', { stroke: 'solid', arrowType: 'async', bidirectional: false }],
]

function parseArrow(
	arrow: string
): { stroke: 'solid' | 'dotted'; arrowType: string; bidirectional: boolean } | undefined {
	for (const [pattern, info] of ARROW_PATTERNS) if (arrow === pattern) return info
}

const MESSAGE_RE = /^(\S+?)\s*(<<-->>|<<->>|-->>|-->|--x|--\)|->>|->|-x|-\))\s*(\S+?)\s*:\s*(.*)$/

interface RawBlock {
	type: string
	label: string
	edgeIds: string[]
	branches?: { label?: string; edgeIds: string[] }[]
	options?: { label: string; edgeIds: string[] }[]
	color?: string
}

function buildBlock(raw: RawBlock): SequenceBlock | null {
	switch (raw.type) {
		case 'loop':
			return { type: 'loop', label: raw.label, edgeIds: raw.edgeIds }
		case 'alt':
			return {
				type: 'alt',
				label: raw.label,
				branches: raw.branches ?? [{ edgeIds: raw.edgeIds }],
			}
		case 'opt':
			return { type: 'opt', label: raw.label, edgeIds: raw.edgeIds }
		case 'par':
			return {
				type: 'par',
				branches: (raw.branches ?? []).map((b) => ({
					label: b.label ?? '',
					edgeIds: b.edgeIds,
				})),
			}
		case 'critical':
			return {
				type: 'critical',
				label: raw.label,
				edgeIds: raw.edgeIds,
				...(raw.options && raw.options.length > 0 && { options: raw.options }),
			}
		case 'break':
			return { type: 'break', label: raw.label, edgeIds: raw.edgeIds }
		case 'rect':
			return { type: 'rect', color: raw.color ?? '', edgeIds: raw.edgeIds }
		default:
			return null
	}
}

export function fromMermaidSequence(input: string): SequenceGraph {
	validateInput(input, 'Mermaid sequence')
	const { lines } = prepareLines(input)
	const header = lines[0]?.trim()
	if (!header || !header.startsWith('sequenceDiagram'))
		throw new Error('Mermaid sequence: expected "sequenceDiagram" header')

	const nodeMap = new Map<string, GraphNode<SequenceNodeData>>()
	const edges: GraphEdge<SequenceEdgeData>[] = []
	const blocks: SequenceBlock[] = []
	let autonumber = false
	let edgeCounter = 0
	let seqNum = 0
	const blockStack: RawBlock[] = []

	function ensureNode(id: string, actorType: 'participant' | 'actor' = 'participant') {
		if (!nodeMap.has(id))
			nodeMap.set(id, {
				type: 'node',
				id,
				parentId: null,
				initialNodeId: null,
				label: id,
				data: { actorType },
			})
	}

	function addEdge(edge: GraphEdge<SequenceEdgeData>) {
		edges.push(edge)
		if (blockStack.length > 0) {
			const top = blockStack[blockStack.length - 1]
			if (top.branches && top.branches.length > 0)
				top.branches[top.branches.length - 1].edgeIds.push(edge.id)
			else if (top.options && top.options.length > 0)
				top.options[top.options.length - 1].edgeIds.push(edge.id)
			else top.edgeIds.push(edge.id)
		}
	}

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue

		if (line === 'autonumber') {
			autonumber = true
			continue
		}

		const participantMatch = line.match(/^(participant|actor)\s+(\S+?)(?:\s+as\s+(.+))?$/)
		if (participantMatch) {
			const actorType = participantMatch[1] as 'participant' | 'actor'
			const id = participantMatch[2]
			const alias = participantMatch[3]?.trim()
			ensureNode(id, actorType)
			const node = nodeMap.get(id)!
			node.data.actorType = actorType
			if (alias) {
				node.data.alias = alias
				node.label = alias
			}
			continue
		}

		const createMatch = line.match(/^create\s+(participant|actor)\s+(\S+?)(?:\s+as\s+(.+))?$/)
		if (createMatch) {
			const actorType = createMatch[1] as 'participant' | 'actor'
			const id = createMatch[2]
			const alias = createMatch[3]?.trim()
			ensureNode(id, actorType)
			const node = nodeMap.get(id)!
			node.data.created = true
			if (alias) {
				node.data.alias = alias
				node.label = alias
			}
			continue
		}

		const destroyMatch = line.match(/^destroy\s+(\S+)$/)
		if (destroyMatch) {
			const id = destroyMatch[1]
			ensureNode(id)
			nodeMap.get(id)!.data.destroyed = true
			continue
		}

		const activateMatch = line.match(/^(activate|deactivate)\s+(\S+)$/)
		if (activateMatch) {
			const kind: 'activation' | 'deactivation' =
				activateMatch[1] === 'activate' ? 'activation' : 'deactivation'
			const actorId = activateMatch[2]
			ensureNode(actorId)
			addEdge({
				type: 'edge',
				id: generateEdgeId(actorId, actorId, edgeCounter++),
				sourceId: actorId,
				targetId: actorId,
				label: '',
				data: {
					kind,
					...(autonumber && { sequenceNumber: ++seqNum }),
				} as SequenceEdgeData,
			})
			continue
		}

		if (/^(loop|alt|opt|par|critical|break)\s+/.test(line) || line.startsWith('rect ')) {
			const spaceIdx = line.indexOf(' ')
			const keyword = line.slice(0, spaceIdx)
			const label = line.slice(spaceIdx + 1).trim()
			if (keyword === 'alt' || keyword === 'par' || keyword === 'critical')
				blockStack.push({
					type: keyword,
					label,
					edgeIds: [],
					branches:
						keyword === 'par'
							? [{ label, edgeIds: [] }]
							: keyword === 'alt'
								? [{ label, edgeIds: [] }]
								: undefined,
					options: keyword === 'critical' ? [] : undefined,
				})
			else if (keyword === 'rect')
				blockStack.push({ type: 'rect', label: '', edgeIds: [], color: label })
			else blockStack.push({ type: keyword, label, edgeIds: [] })
			continue
		}

		if (line.startsWith('else') || line === 'else') {
			if (blockStack.length > 0) {
				const top = blockStack[blockStack.length - 1]
				if (top.branches) {
					const elseLabel = line.length > 4 ? line.slice(5).trim() : undefined
					top.branches.push({ label: elseLabel, edgeIds: [] })
				}
			}
			continue
		}

		if (line.startsWith('and ')) {
			if (blockStack.length > 0) {
				const top = blockStack[blockStack.length - 1]
				if (top.branches) top.branches.push({ label: line.slice(4).trim(), edgeIds: [] })
			}
			continue
		}

		if (line.startsWith('option ')) {
			if (blockStack.length > 0) {
				const top = blockStack[blockStack.length - 1]
				if (top.options) top.options.push({ label: line.slice(7).trim(), edgeIds: [] })
			}
			continue
		}

		if (line === 'end') {
			if (blockStack.length > 0) {
				const finished = blockStack.pop()!
				const block = buildBlock(finished)
				if (block) {
					if (blockStack.length > 0)
						blockStack[blockStack.length - 1].edgeIds.push(
							...finished.edgeIds,
							...(finished.branches?.flatMap((b) => b.edgeIds) ?? []),
							...(finished.options?.flatMap((o) => o.edgeIds) ?? [])
						)
					blocks.push(block)
				}
			}
			continue
		}

		if (/^Note\s+(left|right|over)\s+/i.test(line)) continue

		const msgMatch = line.match(MESSAGE_RE)
		if (msgMatch) {
			let sourceId = msgMatch[1]
			const arrowStr = msgMatch[2]
			let targetId = msgMatch[3]
			const messageText = msgMatch[4].trim()

			let activationOnTarget: 'activation' | 'deactivation' | null = null
			if (targetId.startsWith('+')) {
				activationOnTarget = 'activation'
				targetId = targetId.slice(1)
			} else if (targetId.startsWith('-')) {
				activationOnTarget = 'deactivation'
				targetId = targetId.slice(1)
			}

			let activationOnSource: 'activation' | 'deactivation' | null = null
			if (sourceId.endsWith('+')) {
				activationOnSource = 'activation'
				sourceId = sourceId.slice(0, -1)
			} else if (sourceId.endsWith('-')) {
				activationOnSource = 'deactivation'
				sourceId = sourceId.slice(0, -1)
			}

			ensureNode(sourceId)
			ensureNode(targetId)
			const arrowInfo = parseArrow(arrowStr)
			if (!arrowInfo) continue

			const edgeId = generateEdgeId(sourceId, targetId, edgeCounter++)
			const data: SequenceEdgeData = {
				kind: 'message',
				stroke: arrowInfo.stroke,
				arrowType: arrowInfo.arrowType as SequenceEdgeData['arrowType'],
				...(arrowInfo.bidirectional && { bidirectional: true }),
				...(autonumber && { sequenceNumber: ++seqNum }),
			}
			addEdge({
				type: 'edge',
				id: edgeId,
				sourceId,
				targetId,
				label: unescapeMermaidLabel(messageText),
				data,
			})

			if (activationOnTarget)
				addEdge({
					type: 'edge',
					id: generateEdgeId(targetId, targetId, edgeCounter++),
					sourceId: targetId,
					targetId,
					label: '',
					data: { kind: activationOnTarget } as SequenceEdgeData,
				})

			if (activationOnSource)
				addEdge({
					type: 'edge',
					id: generateEdgeId(sourceId, sourceId, edgeCounter++),
					sourceId,
					targetId: sourceId,
					label: '',
					data: { kind: activationOnSource } as SequenceEdgeData,
				})

			continue
		}
	}

	return {
		id: '',
		type: 'directed',
		initialNodeId: null,
		nodes: Array.from(nodeMap.values()),
		edges,
		data: {
			diagramType: 'sequence',
			...(autonumber && { autonumber: true }),
			...(blocks.length > 0 && { blocks }),
		},
	}
}

// ─── Flowchart parser ────────────────────────────────────────────────────────

const SHAPE_OPENERS: Array<[string, string, string]> = [
	['(((', ')))', 'double-circle'],
	['((', '))', 'circle'],
	['([', '])', 'stadium'],
	['[(', ')]', 'cylinder'],
	['[[', ']]', 'subroutine'],
	['{{', '}}', 'hexagon'],
	['[/', '/]', 'parallelogram'],
	['[\\', '\\]', 'parallelogram-alt'],
	['[/', '\\]', 'trapezoid'],
	['[\\', '/]', 'trapezoid-alt'],
	['(', ')', 'rounded'],
	['{', '}', 'diamond'],
	['>', ']', 'asymmetric'],
	['[', ']', 'rectangle'],
]

function parseNodeDecl(text: string): { id: string; label: string; shape: string } | null {
	for (const [opener, closer, shapeName] of SHAPE_OPENERS) {
		const opIdx = text.indexOf(opener)
		if (opIdx < 0) continue
		const id = text.slice(0, opIdx)
		if (!id) continue
		if (!text.endsWith(closer)) continue
		return {
			id,
			label: text.slice(opIdx + opener.length, text.length - closer.length).trim(),
			shape: shapeName,
		}
	}
	if (/^[a-zA-Z_][\w]*$/.test(text)) return { id: text, label: '', shape: 'rectangle' }
	return null
}

interface EdgeArrowInfo {
	stroke: 'normal' | 'dotted' | 'thick'
	arrowType: 'arrow' | 'none'
	endMarker?: 'arrow' | 'circle' | 'cross'
	startMarker?: 'arrow' | 'circle' | 'cross'
	bidirectional?: boolean
	label?: string
}

const EDGE_ARROWS: Array<[RegExp, EdgeArrowInfo]> = [
	[
		/^<===>$/,
		{
			stroke: 'thick',
			arrowType: 'arrow',
			endMarker: 'arrow',
			startMarker: 'arrow',
			bidirectional: true,
		},
	],
	[
		/^<==>$/,
		{
			stroke: 'thick',
			arrowType: 'arrow',
			endMarker: 'arrow',
			startMarker: 'arrow',
			bidirectional: true,
		},
	],
	[
		/^<-.->$/,
		{
			stroke: 'dotted',
			arrowType: 'arrow',
			endMarker: 'arrow',
			startMarker: 'arrow',
			bidirectional: true,
		},
	],
	[
		/^<-->$/,
		{
			stroke: 'normal',
			arrowType: 'arrow',
			endMarker: 'arrow',
			startMarker: 'arrow',
			bidirectional: true,
		},
	],
	[/^===>$/, { stroke: 'thick', arrowType: 'arrow', endMarker: 'arrow', bidirectional: false }],
	[/^==>$/, { stroke: 'thick', arrowType: 'arrow', endMarker: 'arrow', bidirectional: false }],
	[/^===$/, { stroke: 'thick', arrowType: 'none', endMarker: 'arrow', bidirectional: false }],
	[/^-\.->$/, { stroke: 'dotted', arrowType: 'arrow', endMarker: 'arrow', bidirectional: false }],
	[/^\.-\.>$/, { stroke: 'dotted', arrowType: 'arrow', endMarker: 'arrow', bidirectional: false }],
	[/^-\.-$/, { stroke: 'dotted', arrowType: 'none', endMarker: 'arrow', bidirectional: false }],
	[/^---o$/, { stroke: 'normal', arrowType: 'arrow', endMarker: 'circle', bidirectional: false }],
	[/^--o$/, { stroke: 'normal', arrowType: 'arrow', endMarker: 'circle', bidirectional: false }],
	[/^---x$/, { stroke: 'normal', arrowType: 'arrow', endMarker: 'cross', bidirectional: false }],
	[/^--x$/, { stroke: 'normal', arrowType: 'arrow', endMarker: 'cross', bidirectional: false }],
	[/^--->$/, { stroke: 'normal', arrowType: 'arrow', endMarker: 'arrow', bidirectional: false }],
	[/^-->$/, { stroke: 'normal', arrowType: 'arrow', endMarker: 'arrow', bidirectional: false }],
	[/^---$/, { stroke: 'normal', arrowType: 'none', endMarker: 'arrow', bidirectional: false }],
	[/^--$/, { stroke: 'normal', arrowType: 'none', endMarker: 'arrow', bidirectional: false }],
]

function findEdge(line: string): {
	sourceText: string
	targetText: string
	info: EdgeArrowInfo
	rest: string
} | null {
	const pipeMatch = line.match(/^(.+?)\s*([-=.<>ox]+)\|([^|]*)\|\s*(.+)$/)
	if (pipeMatch) {
		const arrowStr = pipeMatch[2]
		for (const [re, info] of EDGE_ARROWS)
			if (re.test(arrowStr))
				return {
					sourceText: pipeMatch[1].trim(),
					targetText: pipeMatch[4].trim(),
					info: { ...info, label: pipeMatch[3].trim() },
					rest: '',
				}
	}

	const inlineMatch = line.match(/^(.+?)\s*(--)\s+([^-][^>]*?)\s*(-->)\s*(.+)$/)
	if (inlineMatch)
		return {
			sourceText: inlineMatch[1].trim(),
			targetText: inlineMatch[5].trim(),
			info: {
				stroke: 'normal',
				arrowType: 'arrow',
				endMarker: 'arrow',
				bidirectional: false,
				label: inlineMatch[3].trim(),
			},
			rest: '',
		}

	for (const [re, info] of EDGE_ARROWS) {
		const arrowSource = re.source.replace(/^\^/, '').replace(/\$$/, '')
		const fullRe = new RegExp(`^(.+?)\\s*(${arrowSource})\\s*(.+)$`)
		const m = line.match(fullRe)
		if (m)
			return {
				sourceText: m[1].trim(),
				targetText: m[3].trim(),
				info: { ...info, label: '' },
				rest: '',
			}
	}
	return null
}

function splitFlowchartStatements(line: string) {
	const statements: string[] = []
	let current = ''
	let quote: '"' | "'" | null = null
	let escaped = false

	for (let i = 0; i < line.length; i++) {
		const char = line[i]

		if (escaped) {
			current += char
			escaped = false
			continue
		}

		if (char === '\\') {
			current += char
			escaped = true
			continue
		}

		if (quote) {
			current += char
			if (char === quote) quote = null
			continue
		}

		if (char === '"' || char === "'") {
			current += char
			quote = char
			continue
		}

		if (char === ';') {
			const next = current.trim()
			if (next) statements.push(next)
			current = ''
			continue
		}

		current += char
	}

	const tail = current.trim()
	if (tail) statements.push(tail)
	return statements
}

export function fromMermaidFlowchart(input: string): FlowchartGraph {
	validateInput(input, 'Mermaid flowchart')
	const { lines } = prepareLines(input)
	const headerMatch = lines[0]?.trim()?.match(/^(graph|flowchart)\s+(TD|TB|BT|LR|RL)\s*$/)
	if (!headerMatch)
		throw new Error(
			'Mermaid flowchart: expected "graph <direction>" or "flowchart <direction>" header'
		)

	const direction = MERMAID_TO_DIRECTION[headerMatch[2]] ?? 'down'
	const nodeMap = new Map<string, GraphNode<FlowchartNodeData>>()
	const edges: GraphEdge<FlowchartEdgeData>[] = []
	const classDefs: Record<string, Record<string, string>> = {}
	const classAssignments: Record<string, string[]> = {}
	let edgeCounter = 0
	const parentStack: (string | null)[] = [null]

	function ensureNode(id: string, label?: string, shape?: string) {
		if (!nodeMap.has(id))
			nodeMap.set(id, {
				type: 'node',
				id,
				parentId: parentStack[parentStack.length - 1],
				initialNodeId: null,
				label: label ?? '',
				data: {},
				...(shape && shape !== 'rectangle' && { shape }),
			})
		const node = nodeMap.get(id)!
		const currentParentId = parentStack[parentStack.length - 1]
		if (!node.parentId && currentParentId) node.parentId = currentParentId
		if (label && !node.label) node.label = label
		if (shape && shape !== 'rectangle' && !node.shape) node.shape = shape
		return node
	}

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue
		const statements = splitFlowchartStatements(line)

		for (const statement of statements) {
			if (!statement) continue

			const subgraphMatch = statement.match(/^subgraph\s+(\S+?)(?:\s*\[(.+)\])?\s*$/)
			if (subgraphMatch) {
				const subId = subgraphMatch[1]
				ensureNode(subId, subgraphMatch[2]?.trim() ?? subId)
				parentStack.push(subId)
				continue
			}

			if (/^direction\s+(TD|TB|BT|LR|RL)\s*$/.test(statement)) continue

			if (statement === 'end') {
				if (parentStack.length > 1) parentStack.pop()
				continue
			}

			const classDefMatch = statement.match(/^classDef\s+(\S+)\s+(.+)$/)
			if (classDefMatch) {
				const className = classDefMatch[1]
				const propsStr = classDefMatch[2]
				const props: Record<string, string> = {}
				for (const pair of propsStr.split(',')) {
					const [k, v] = pair.split(':').map((s) => s.trim())
					if (k && v) props[k] = v
				}
				classDefs[className] = props
				continue
			}

			const classAssignMatch = statement.match(/^class\s+(.+)\s+(\S+)\s*$/)
			if (classAssignMatch) {
				const nodeIds = classAssignMatch[1].split(',').map((s) => s.trim())
				const className = classAssignMatch[2]
				for (const nid of nodeIds) {
					if (!classAssignments[nid]) classAssignments[nid] = []
					classAssignments[nid].push(className)
				}
				continue
			}

			const styleMatch = statement.match(/^style\s+(\S+)\s+(.+)$/)
			if (styleMatch) {
				const nodeId = styleMatch[1]
				const propsStr = styleMatch[2]
				ensureNode(nodeId)
				const node = nodeMap.get(nodeId)!
				const style: Record<string, string> = {}
				for (const pair of propsStr.split(',')) {
					const [k, v] = pair.split(':').map((s) => s.trim())
					if (k && v) {
						if (k === 'fill') node.color = v
						style[k] = v
					}
				}
				if (Object.keys(style).length > 0) node.style = { ...(node.style ?? {}), ...style }
				continue
			}

			if (statement.startsWith('linkStyle ')) continue

			const clickMatch = statement.match(/^click\s+(\S+)\s+"([^"]*)"(?:\s+"([^"]*)")?\s*$/)
			if (clickMatch) {
				const nodeId = clickMatch[1]
				ensureNode(nodeId)
				const node = nodeMap.get(nodeId)!
				node.data.link = clickMatch[2]
				if (clickMatch[3]) node.data.tooltip = clickMatch[3]
				continue
			}

			let remaining = statement
			let foundEdge = false
			while (remaining) {
				const edgeResult = findEdge(remaining)
				if (!edgeResult) break
				foundEdge = true

				const sourceDecl = parseNodeDecl(edgeResult.sourceText)
				if (sourceDecl) ensureNode(sourceDecl.id, sourceDecl.label, sourceDecl.shape)

				const targetDecl = parseNodeDecl(edgeResult.targetText)
				let targetId: string
				if (targetDecl) {
					ensureNode(targetDecl.id, targetDecl.label, targetDecl.shape)
					targetId = targetDecl.id
					remaining = ''
				} else {
					const nextEdge = findEdge(edgeResult.targetText)
					if (nextEdge) {
						const tDecl = parseNodeDecl(nextEdge.sourceText)
						if (tDecl) {
							ensureNode(tDecl.id, tDecl.label, tDecl.shape)
							targetId = tDecl.id
						} else {
							targetId = nextEdge.sourceText
							ensureNode(targetId)
						}
						remaining = edgeResult.targetText
					} else {
						targetId = edgeResult.targetText
						ensureNode(targetId)
						remaining = ''
					}
				}

				const sourceId = sourceDecl ? sourceDecl.id : edgeResult.sourceText
				ensureNode(sourceId)
				const edgeId = generateEdgeId(sourceId, targetId, edgeCounter++)
				const info = edgeResult.info
				edges.push({
					type: 'edge',
					id: edgeId,
					sourceId,
					targetId,
					label: info.label ? unescapeMermaidLabel(info.label) : '',
					data: {
						stroke: info.stroke,
						arrowType: info.arrowType,
						...(info.endMarker !== 'arrow' && { endMarker: info.endMarker }),
						...(info.startMarker && { startMarker: info.startMarker }),
						...(info.bidirectional && { bidirectional: true }),
					},
				})
			}
			if (foundEdge) continue

			const nodeDecl = parseNodeDecl(statement)
			if (nodeDecl) {
				ensureNode(nodeDecl.id, nodeDecl.label, nodeDecl.shape)
				continue
			}
		}
	}

	for (const [nodeId, classes] of Object.entries(classAssignments)) {
		const node = nodeMap.get(nodeId)
		if (node) {
			node.data.classes = classes
			for (const cls of classes) {
				const def = classDefs[cls]
				if (def) {
					if (def.fill) node.color = def.fill
					const style: Record<string, string> = {}
					for (const [k, v] of Object.entries(def)) style[k] = v
					if (Object.keys(style).length > 0) node.style = { ...(node.style ?? {}), ...style }
				}
			}
		}
	}

	return {
		id: '',
		type: 'directed',
		initialNodeId: null,
		nodes: Array.from(nodeMap.values()),
		edges,
		data: {
			diagramType: 'flowchart',
			...(Object.keys(classDefs).length > 0 && { classDefs }),
		},
		direction,
	}
}

// ─── State diagram parser ────────────────────────────────────────────────────

export function fromMermaidState(input: string): StateGraph {
	validateInput(input, 'Mermaid state')
	const { lines } = prepareLines(input)
	const header = lines[0]?.trim()
	if (!header || (!header.startsWith('stateDiagram-v2') && !header.startsWith('stateDiagram')))
		throw new Error('Mermaid state: expected "stateDiagram" or "stateDiagram-v2" header')

	const nodeMap = new Map<string, GraphNode<StateNodeData>>()
	const edges: GraphEdge<StateEdgeData>[] = []
	let edgeCounter = 0
	let startCounter = 0
	let endCounter = 0
	const parentStack: (string | null)[] = [null]

	function ensureNode(id: string) {
		if (!nodeMap.has(id))
			nodeMap.set(id, {
				type: 'node',
				id,
				parentId: parentStack[parentStack.length - 1],
				initialNodeId: null,
				label: id,
				data: {},
			})
		return nodeMap.get(id)!
	}

	function resolveStarNode(position: 'source' | 'target'): string {
		if (position === 'source') {
			const id = `[*]_start_${startCounter++}`
			const node = ensureNode(id)
			node.label = '[*]'
			node.data.isStart = true
			node.shape = 'start'
			return id
		} else {
			const id = `[*]_end_${endCounter++}`
			const node = ensureNode(id)
			node.label = '[*]'
			node.data.isEnd = true
			node.shape = 'end'
			return id
		}
	}

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue

		if (/^direction\s+(TD|TB|BT|LR|RL)\s*$/.test(line)) continue

		const compositeMatch = line.match(/^state\s+(\S+)\s*\{?\s*$/)
		if (compositeMatch && line.includes('{')) {
			const stateId = compositeMatch[1]
			ensureNode(stateId)
			parentStack.push(stateId)
			continue
		}

		const stereotypeMatch = line.match(/^state\s+(\S+)\s+<<(choice|fork|join)>>\s*$/)
		if (stereotypeMatch) {
			const stateId = stereotypeMatch[1]
			const stateType = stereotypeMatch[2] as 'choice' | 'fork' | 'join'
			const node = ensureNode(stateId)
			node.data.stateType = stateType
			node.shape = stateType
			continue
		}

		const stateAsMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\S+)\s*$/)
		if (stateAsMatch) {
			const description = stateAsMatch[1]
			const stateId = stateAsMatch[2]
			const node = ensureNode(stateId)
			node.data.description = description
			continue
		}

		if (line === '}' || line === 'end') {
			if (parentStack.length > 1) parentStack.pop()
			continue
		}

		const noteMatch = line.match(/^note\s+(left|right)\s+of\s+(\S+)\s*:\s*(.+)$/i)
		if (noteMatch) {
			const position = noteMatch[1].toLowerCase() as 'left' | 'right'
			const stateId = noteMatch[2]
			const text = noteMatch[3].trim()
			const node = ensureNode(stateId)
			if (!node.data.notes) node.data.notes = []
			node.data.notes.push({ position, text })
			continue
		}

		const transMatch = line.match(/^(\S+)\s*-->\s*(\S+)\s*(?::\s*(.+))?$/)
		if (transMatch) {
			let sourceId = transMatch[1]
			let targetId = transMatch[2]
			const label = transMatch[3]?.trim() ?? ''
			if (sourceId === '[*]') sourceId = resolveStarNode('source')
			else ensureNode(sourceId)
			if (targetId === '[*]') targetId = resolveStarNode('target')
			else ensureNode(targetId)
			const edgeId = generateEdgeId(sourceId, targetId, edgeCounter++)
			edges.push({
				type: 'edge',
				id: edgeId,
				sourceId,
				targetId,
				label: label ? unescapeMermaidLabel(label) : '',
				data: {},
			})
			continue
		}

		const descMatch = line.match(/^(\S+)\s*:\s*(.+)$/)
		if (descMatch) {
			const stateId = descMatch[1]
			const description = descMatch[2].trim()
			const node = ensureNode(stateId)
			node.data.description = description
			continue
		}

		if (/^[a-zA-Z_][\w]*$/.test(line)) {
			ensureNode(line)
			continue
		}
	}

	return {
		id: '',
		type: 'directed',
		initialNodeId: null,
		nodes: Array.from(nodeMap.values()),
		edges,
		data: { diagramType: 'stateDiagram' },
	}
}

// ─── Class diagram parser ────────────────────────────────────────────────────

const RELATIONSHIP_ARROWS: Array<[string, ClassEdgeData['relationType'], boolean]> = [
	['<|--', 'inheritance', true],
	['--|>', 'inheritance', false],
	['<|..', 'realization', true],
	['..|>', 'realization', false],
	['*--', 'composition', true],
	['--*', 'composition', false],
	['o--', 'aggregation', true],
	['--o', 'aggregation', false],
	['<--', 'association', true],
	['-->', 'association', false],
	['<..', 'dependency', true],
	['..>', 'dependency', false],
	['--', 'link', false],
	['..', 'dashed', false],
]

function parseRelationship(line: string): {
	leftClass: string
	rightClass: string
	relationType: ClassEdgeData['relationType']
	label: string
	leftCard?: string
	rightCard?: string
} | null {
	for (const [arrow, relationType, reversed] of RELATIONSHIP_ARROWS) {
		const idx = line.indexOf(arrow)
		if (idx < 0) continue
		let left = line.slice(0, idx).trim()
		let right = line.slice(idx + arrow.length).trim()
		let label = ''
		const colonIdx = right.indexOf(':')
		if (colonIdx >= 0) {
			label = right.slice(colonIdx + 1).trim()
			right = right.slice(0, colonIdx).trim()
		}

		let leftCard: string | undefined
		let rightCard: string | undefined

		const leftCardMatch = left.match(/^"([^"]+)"\s+(.+)$/)
		if (leftCardMatch) {
			leftCard = leftCardMatch[1]
			left = leftCardMatch[2].trim()
		} else {
			const leftCardTrail = left.match(/^(.+?)\s+"([^"]+)"$/)
			if (leftCardTrail) {
				leftCard = leftCardTrail[2]
				left = leftCardTrail[1].trim()
			}
		}

		const rightCardMatch = right.match(/^"([^"]+)"\s+(.+)$/)
		if (rightCardMatch) {
			rightCard = rightCardMatch[1]
			right = rightCardMatch[2].trim()
		} else {
			const rightCardTrail = right.match(/^(.+?)\s+"([^"]+)"$/)
			if (rightCardTrail) {
				rightCard = rightCardTrail[2]
				right = rightCardTrail[1].trim()
			}
		}

		if (!left || !right) continue

		if (reversed)
			return {
				leftClass: right,
				rightClass: left,
				relationType,
				label,
				leftCard: rightCard,
				rightCard: leftCard,
			}

		return { leftClass: left, rightClass: right, relationType, label, leftCard, rightCard }
	}
	return null
}

function parseMember(line: string): {
	visibility: '+' | '-' | '#' | '~'
	name: string
	type?: string
	isMethod: boolean
} {
	const trimmed = line.trim()
	let visibility: '+' | '-' | '#' | '~' = '+'
	let rest = trimmed
	if (/^[+\-#~]/.test(rest)) {
		visibility = rest[0] as '+' | '-' | '#' | '~'
		rest = rest.slice(1).trim()
	}
	const isMethod = rest.includes('(')
	let name = rest
	let type: string | undefined
	if (isMethod) {
		const methodMatch = rest.match(/^(.+\))\s*(.+)?$/)
		if (methodMatch) {
			name = methodMatch[1]
			type = methodMatch[2]
		}
	} else {
		const fieldMatch = rest.match(/^(\S+)\s+(\S+)$/)
		if (fieldMatch) {
			type = fieldMatch[1]
			name = fieldMatch[2]
		}
	}
	return { visibility, name, type, isMethod }
}

export function fromMermaidClass(input: string): ClassGraph {
	validateInput(input, 'Mermaid class')
	const { lines } = prepareLines(input)
	const header = lines[0]?.trim()
	if (!header || !header.startsWith('classDiagram'))
		throw new Error('Mermaid class: expected "classDiagram" header')

	const nodeMap = new Map<string, GraphNode<ClassNodeData>>()
	const edges: GraphEdge<ClassEdgeData>[] = []
	let edgeCounter = 0

	function ensureNode(id: string) {
		if (!nodeMap.has(id))
			nodeMap.set(id, {
				type: 'node',
				id,
				parentId: null,
				initialNodeId: null,
				label: id,
				data: {},
			})
		return nodeMap.get(id)!
	}

	let currentClass: string | null = null
	let inClassBlock = false
	let braceDepth = 0

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue

		const classBlockMatch = line.match(/^class\s+(\S+?)(?:~(.+?)~)?\s*\{\s*$/)
		if (classBlockMatch) {
			currentClass = classBlockMatch[1]
			const node = ensureNode(currentClass)
			if (classBlockMatch[2]) node.data.genericType = classBlockMatch[2]
			inClassBlock = true
			braceDepth = 1
			continue
		}

		if (inClassBlock && currentClass) {
			if (line === '}') {
				braceDepth--
				if (braceDepth <= 0) {
					inClassBlock = false
					currentClass = null
				}
				continue
			}
			const annotMatch = line.match(/^<<(.+)>>$/)
			if (annotMatch) {
				nodeMap.get(currentClass)!.data.annotation = annotMatch[1]
				continue
			}
			const node = nodeMap.get(currentClass)!
			if (!node.data.members) node.data.members = []
			node.data.members.push(parseMember(line))
			continue
		}

		const classInlineMatch = line.match(/^class\s+(\S+?)(?:~(.+?)~)?\s*$/)
		if (classInlineMatch) {
			const node = ensureNode(classInlineMatch[1])
			if (classInlineMatch[2]) node.data.genericType = classInlineMatch[2]
			continue
		}

		const annotLineMatch = line.match(/^<<(.+)>>\s+(\S+)\s*$/)
		if (annotLineMatch) {
			const node = ensureNode(annotLineMatch[2])
			node.data.annotation = annotLineMatch[1]
			continue
		}

		const inlineMemberMatch = line.match(/^(\S+)\s*:\s*(.+)$/)
		if (inlineMemberMatch) {
			if (!parseRelationship(line)) {
				const node = ensureNode(inlineMemberMatch[1])
				if (!node.data.members) node.data.members = []
				node.data.members.push(parseMember(inlineMemberMatch[2]))
				continue
			}
		}

		const rel = parseRelationship(line)
		if (rel) {
			ensureNode(rel.leftClass)
			ensureNode(rel.rightClass)
			const edgeId = generateEdgeId(rel.leftClass, rel.rightClass, edgeCounter++)
			edges.push({
				type: 'edge',
				id: edgeId,
				sourceId: rel.leftClass,
				targetId: rel.rightClass,
				label: rel.label ? unescapeMermaidLabel(rel.label) : '',
				data: {
					relationType: rel.relationType,
					...(rel.leftCard && { sourceCardinality: rel.leftCard }),
					...(rel.rightCard && { targetCardinality: rel.rightCard }),
				},
			})
			continue
		}
	}

	return {
		id: '',
		type: 'directed',
		initialNodeId: null,
		nodes: Array.from(nodeMap.values()),
		edges,
		data: { diagramType: 'classDiagram' },
	}
}

// ─── ER diagram parser ───────────────────────────────────────────────────────

const LEFT_CARDINALITY: Record<string, EREdgeData['sourceCardinality']> = {
	'||': 'one',
	'|o': 'zero-or-one',
	'}|': 'one-or-more',
	'}o': 'zero-or-more',
}

const RIGHT_CARDINALITY: Record<string, EREdgeData['targetCardinality']> = {
	'||': 'one',
	'o|': 'zero-or-one',
	'|{': 'one-or-more',
	'o{': 'zero-or-more',
}

function parseERRelationship(symbol: string): {
	sourceCardinality: EREdgeData['sourceCardinality']
	targetCardinality: EREdgeData['targetCardinality']
	identifying: boolean
} | null {
	if (symbol.length < 6) return null
	const left = symbol.slice(0, 2)
	const mid = symbol.slice(2, 4)
	const right = symbol.slice(4, 6)
	const srcCard = LEFT_CARDINALITY[left]
	const tgtCard = RIGHT_CARDINALITY[right]
	if (!srcCard || !tgtCard) return null
	let identifying: boolean
	if (mid === '--') identifying = true
	else if (mid === '..') identifying = false
	else return null
	return { sourceCardinality: srcCard, targetCardinality: tgtCard, identifying }
}

const ER_LINE_RE = /^(\S+)\s+([|}{o.][|}{o.][-.][-.][|}{o.][|}{o.])\s+(\S+)\s*:\s*"?([^"]*)"?\s*$/

export function fromMermaidER(input: string): ERGraph {
	validateInput(input, 'Mermaid ER')
	const { lines } = prepareLines(input)
	const header = lines[0]?.trim()
	if (!header || !header.startsWith('erDiagram'))
		throw new Error('Mermaid ER: expected "erDiagram" header')

	const nodeMap = new Map<string, GraphNode<ERNodeData>>()
	const edges: GraphEdge<EREdgeData>[] = []
	let edgeCounter = 0

	function ensureNode(id: string) {
		if (!nodeMap.has(id))
			nodeMap.set(id, {
				type: 'node',
				id,
				parentId: null,
				initialNodeId: null,
				label: id,
				data: {},
			})
		return nodeMap.get(id)!
	}

	let currentEntity: string | null = null
	let inBlock = false

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue

		const blockMatch = line.match(/^(\S+)\s*\{\s*$/)
		if (blockMatch) {
			currentEntity = blockMatch[1]
			ensureNode(currentEntity)
			inBlock = true
			continue
		}

		if (inBlock && currentEntity) {
			if (line === '}') {
				inBlock = false
				currentEntity = null
				continue
			}
			const attrMatch = line.match(/^(\S+)\s+(\S+)(?:\s+(PK|FK|UK))?(?:\s+"([^"]*)")?$/)
			if (attrMatch) {
				const node = nodeMap.get(currentEntity)!
				if (!node.data.attributes) node.data.attributes = []
				node.data.attributes.push({
					type: attrMatch[1],
					name: attrMatch[2],
					...(attrMatch[3] && { key: attrMatch[3] as 'PK' | 'FK' | 'UK' }),
					...(attrMatch[4] && { comment: attrMatch[4] }),
				})
			}
			continue
		}

		const relMatch = line.match(ER_LINE_RE)
		if (relMatch) {
			const leftEntity = relMatch[1]
			const symbol = relMatch[2]
			const rightEntity = relMatch[3]
			const label = relMatch[4].trim()
			ensureNode(leftEntity)
			ensureNode(rightEntity)
			const rel = parseERRelationship(symbol)
			if (rel) {
				const edgeId = generateEdgeId(leftEntity, rightEntity, edgeCounter++)
				edges.push({
					type: 'edge',
					id: edgeId,
					sourceId: leftEntity,
					targetId: rightEntity,
					label: label ? unescapeMermaidLabel(label) : '',
					data: rel,
				})
			}
			continue
		}

		if (/^[A-Z_][\w]*$/i.test(line)) ensureNode(line)
	}

	return {
		id: '',
		type: 'directed',
		initialNodeId: null,
		nodes: Array.from(nodeMap.values()),
		edges,
		data: { diagramType: 'erDiagram' },
	}
}

// ─── Block diagram parser ────────────────────────────────────────────────────

const BLOCK_SHAPES: Array<[string, string, string]> = [
	['((', '))', 'circle'],
	['(', ')', 'rounded'],
	['{{', '}}', 'hexagon'],
	['{', '}', 'diamond'],
	['[[', ']]', 'subroutine'],
	['[', ']', 'rectangle'],
]

function parseBlockNode(
	text: string
): { id: string; label: string; shape: string | undefined } | null {
	for (const [opener, closer, shapeName] of BLOCK_SHAPES) {
		const idx = text.indexOf(opener)
		if (idx < 0) continue
		const id = text.slice(0, idx).trim()
		if (!id) continue
		if (!text.endsWith(closer)) continue
		return {
			id,
			label: text.slice(idx + opener.length, text.length - closer.length).trim(),
			shape: shapeName,
		}
	}
	if (/^[a-zA-Z_][\w]*$/.test(text.trim())) return { id: text.trim(), label: '', shape: undefined }
	return null
}

export function fromMermaidBlock(input: string): BlockGraph {
	validateInput(input, 'Mermaid block')
	const { lines } = prepareLines(input)
	const header = lines[0]?.trim()
	if (!header || !header.startsWith('block-beta'))
		throw new Error('Mermaid block: expected "block-beta" header')

	const nodeMap = new Map<string, GraphNode<BlockNodeData>>()
	const edges: GraphEdge<BlockEdgeData>[] = []
	let edgeCounter = 0
	let columns: number | undefined
	const parentStack: (string | null)[] = [null]
	let blockCounter = 0

	function ensureNode(id: string, label?: string, shape?: string) {
		if (!nodeMap.has(id))
			nodeMap.set(id, {
				type: 'node',
				id,
				parentId: parentStack[parentStack.length - 1],
				initialNodeId: null,
				label: label ?? id,
				data: {},
				...(shape && { shape }),
			})
		return nodeMap.get(id)!
	}

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue

		const colsMatch = line.match(/^columns\s+(\d+)\s*$/)
		if (colsMatch) {
			columns = parseInt(colsMatch[1], 10)
			continue
		}

		if (line === 'block' || line.startsWith('block:')) {
			const blockId = line.includes(':') ? line.split(':')[1].trim() : `__block_${blockCounter++}`
			ensureNode(blockId)
			parentStack.push(blockId)
			continue
		}

		if (line === 'end') {
			if (parentStack.length > 1) parentStack.pop()
			continue
		}

		const edgeMatch = line.match(/^(\S+)\s*(-->|---|==>|-\.->)\s*(\S+)\s*$/)
		if (edgeMatch) {
			const sourceId = edgeMatch[1]
			const targetId = edgeMatch[3]
			ensureNode(sourceId)
			ensureNode(targetId)
			const edgeId = generateEdgeId(sourceId, targetId, edgeCounter++)
			edges.push({
				type: 'edge',
				id: edgeId,
				sourceId,
				targetId,
				label: '',
				data: {},
			})
			continue
		}

		const spanMatch = line.match(/^(\S+?)(?:\["([^"]*)"\])?:(\d+)\s*$/)
		if (spanMatch) {
			const id = spanMatch[1]
			const label = spanMatch[2] ?? id
			const span = parseInt(spanMatch[3], 10)
			const node = ensureNode(id, label)
			node.data.span = span
			continue
		}

		const parts = line.split(/\s+/)
		let consumed = false
		for (const part of parts) {
			const parsed = parseBlockNode(part)
			if (parsed) {
				ensureNode(parsed.id, parsed.label, parsed.shape)
				consumed = true
			}
		}
		if (consumed) continue

		const nodeDecl = parseBlockNode(line)
		if (nodeDecl) ensureNode(nodeDecl.id, nodeDecl.label, nodeDecl.shape)
	}

	return {
		id: '',
		type: 'directed',
		initialNodeId: null,
		nodes: Array.from(nodeMap.values()),
		edges,
		data: {
			diagramType: 'block',
			...(columns !== undefined && { columns }),
		},
	}
}
