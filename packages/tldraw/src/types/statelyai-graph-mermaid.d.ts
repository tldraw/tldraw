declare module '@statelyai/graph/mermaid' {
	export interface ParsedMermaidGraphNode {
		id: string
		label: string
		shape?: string
		data?: unknown
	}

	export interface ParsedMermaidGraphEdge {
		id: string
		sourceId: string
		targetId: string
		label: string
		data?: unknown
	}

	export interface ParsedMermaidGraph {
		direction?: 'up' | 'down' | 'left' | 'right'
		nodes: ParsedMermaidGraphNode[]
		edges: ParsedMermaidGraphEdge[]
	}

	export function fromMermaidFlowchart(input: string): ParsedMermaidGraph
	export function fromMermaidSequence(input: string): ParsedMermaidGraph
	export function fromMermaidState(input: string): ParsedMermaidGraph
	export function fromMermaidClass(input: string): ParsedMermaidGraph
	export function fromMermaidER(input: string): ParsedMermaidGraph
	export function fromMermaidMindmap(input: string): ParsedMermaidGraph
	export function fromMermaidBlock(input: string): ParsedMermaidGraph
}
