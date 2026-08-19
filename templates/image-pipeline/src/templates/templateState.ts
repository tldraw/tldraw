import { NodeType } from '../nodes/nodeTypes'

/**
 * A saved pipeline template — a serialized subgraph that can be stamped
 * onto the canvas as a reusable "design machine".
 */
export interface PipelineTemplate {
	id: string
	name: string
	description: string
	createdAt: number
	/** Serialized node shapes (relative positions). */
	nodes: SerializedTemplateNode[]
	/** Serialized connections between the nodes. */
	connections: SerializedTemplateConnection[]
}

export interface SerializedTemplateNode {
	/** A local ID used only within this template for wiring connections. */
	localId: string
	nodeType: NodeType
	/** Position relative to the top-left corner of the template's bounding box. */
	relativeX: number
	relativeY: number
}

export interface SerializedTemplateConnection {
	fromLocalId: string
	fromPortId: string
	toLocalId: string
	toPortId: string
}

const STORAGE_KEY = 'image-pipeline-templates'

/** Load all saved templates from localStorage. */
export function loadTemplates(): PipelineTemplate[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		return raw ? JSON.parse(raw) : []
	} catch {
		return []
	}
}

/** Save a template to localStorage. */
export function saveTemplate(template: PipelineTemplate) {
	const templates = loadTemplates()
	templates.push(template)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

/** Delete a template by id. */
export function deleteTemplate(id: string) {
	const templates = loadTemplates().filter((t) => t.id !== id)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}
