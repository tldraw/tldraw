import { Editor, TLShape, TLShapeId, TLShapePartial, createShapeId, toRichText } from 'tldraw'
import { IdeaNode, IdeaShapeMeta, IdeaStatus } from './types'

const IDEA_NOTE_WIDTH = 480

function asIdeaShapeMeta(shape: TLShape): IdeaShapeMeta | null {
	const meta = shape.meta as Record<string, unknown> | undefined
	if (!meta || meta.kind !== 'idea-node') return null

	return {
		kind: 'idea-node',
		domain: meta.domain === 'code' ? 'code' : 'idea',
		title: String(meta.title ?? ''),
		description: String(meta.description ?? ''),
		inputs: Array.isArray(meta.inputs) ? meta.inputs.map(String) : [],
		outputs: Array.isArray(meta.outputs) ? meta.outputs.map(String) : [],
		language: meta.language ? String(meta.language) : undefined,
		code: meta.code ? String(meta.code) : undefined,
		depth: Number(meta.depth ?? 0),
		parents: Array.isArray(meta.parents) ? (meta.parents as TLShapeId[]) : [],
		status: (meta.status as IdeaStatus) ?? 'seed',
	}
}

function shapeToIdeaNode(shape: TLShape, meta: IdeaShapeMeta): IdeaNode {
	return {
		id: shape.id,
		domain: meta.domain ?? 'idea',
		title: meta.title,
		description: meta.description,
		inputs: meta.inputs,
		outputs: meta.outputs,
		language: meta.language,
		code: meta.code,
		depth: meta.depth,
		parents: meta.parents,
		status: meta.status,
		x: shape.x,
		y: shape.y,
	}
}

function buildIdeaBody(
	domain: IdeaNode['domain'],
	title: string,
	description: string,
	inputs: string[],
	outputs: string[],
	language?: string
): string {
	const inputText = inputs.length > 0 ? inputs.join(', ') : 'none'
	const outputText = outputs.length > 0 ? outputs.join(', ') : 'none'
	const languageLine = domain === 'code' && language ? `\nLanguage: ${language}` : ''
	return `${title}\n\n${description}\n\nInputs: ${inputText}\nOutputs: ${outputText}${languageLine}`
}

export function getIdeaNodes(editor: Editor): IdeaNode[] {
	const shapes = editor.getCurrentPageShapes()
	const nodes: IdeaNode[] = []
	for (const shape of shapes) {
		const meta = asIdeaShapeMeta(shape)
		if (!meta) continue
		nodes.push(shapeToIdeaNode(shape, meta))
	}
	return nodes.sort((a, b) => a.y - b.y || a.x - b.x)
}

export function isIdeaShape(shape: TLShape | null | undefined): boolean {
	if (!shape) return false
	return !!asIdeaShapeMeta(shape)
}

export function getIdeaNodeById(editor: Editor, shapeId: TLShapeId): IdeaNode | null {
	const shape = editor.getShape(shapeId)
	if (!shape) return null
	const meta = asIdeaShapeMeta(shape)
	if (!meta) return null
	return shapeToIdeaNode(shape, meta)
}

export function createIdeaNode(
	editor: Editor,
	idea: Omit<IdeaNode, 'id' | 'x' | 'y'>,
	position: { x: number; y: number }
): TLShapeId {
	const id = createShapeId()
	editor.createShape({
		id,
		type: 'text',
		x: position.x,
		y: position.y,
		props: {
			richText: toRichText(
				buildIdeaBody(
					idea.domain,
					idea.title,
					idea.description,
					idea.inputs,
					idea.outputs,
					idea.language
				)
			),
			autoSize: false,
			w: IDEA_NOTE_WIDTH,
			font: 'mono',
		},
		meta: {
			kind: 'idea-node',
			domain: idea.domain,
			title: idea.title,
			description: idea.description,
			inputs: idea.inputs,
			outputs: idea.outputs,
			language: idea.language,
			code: idea.code,
			depth: idea.depth,
			parents: idea.parents,
			status: idea.status,
		},
	})
	return id
}

export function updateIdeaStatus(editor: Editor, shapeId: TLShapeId, status: IdeaStatus) {
	const shape = editor.getShape(shapeId)
	if (!shape) return
	const meta = asIdeaShapeMeta(shape)
	if (!meta) return

	editor.updateShape({
		id: shape.id,
		type: shape.type,
		meta: { ...shape.meta, status },
	} as TLShapePartial)
}

export function getNextIdeaPosition(editor: Editor): { x: number; y: number } {
	const nodes = getIdeaNodes(editor)
	if (nodes.length === 0) {
		const { x, y } = editor.getViewportScreenCenter()
		const page = editor.screenToPage({ x, y })
		return { x: Math.round(page.x), y: Math.round(page.y) }
	}

	const leftMost = Math.min(...nodes.map((n) => n.x))
	const maxY = Math.max(...nodes.map((n) => n.y))
	return { x: Math.round(leftMost), y: Math.round(maxY + 240) }
}

export function parseCsvTags(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

export function createPairKey(aId: TLShapeId, bId: TLShapeId): string {
	return [aId, bId].sort().join('::')
}
