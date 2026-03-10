export interface NodeLayout {
	id: string // Mermaid node/participant/class/state/entity ID
	x: number // top-left in SVG coordinates
	y: number
	width: number
	height: number
	geoShape: string // tldraw geo shape type
	label: string
	meta: Record<string, unknown> // diagram-specific metadata for round-trip
}

export interface EdgeLayout {
	id: string
	from: string // source node ID
	to: string // target node ID
	label: string
	meta: Record<string, unknown>
}

export interface DiagramLayout {
	type: string
	nodes: NodeLayout[]
	edges: EdgeLayout[]
}
