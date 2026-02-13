import {
	BindingOnChangeOptions,
	BindingOnCreateOptions,
	BindingOnDeleteOptions,
	BindingOnShapeDeleteOptions,
	BindingOnShapeIsolateOptions,
	BindingUtil,
	createComputedCache,
	Editor,
	T,
	TLBinding,
	TLShapeId,
} from 'tldraw'
import { getNodePorts } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { onNodePortConnect, onNodePortDisconnect } from '../nodes/nodeTypes'
import { PortId } from '../ports/Port'
import { ConnectionShape } from './ConnectionShapeUtil'

const CONNECTION_TYPE = 'connection'

declare module 'tldraw' {
	export interface TLGlobalBindingPropsMap {
		[CONNECTION_TYPE]: {
			portId: PortId
			terminal: 'start' | 'end'
			order?: number
		}
	}
}

export type ConnectionBinding = TLBinding<typeof CONNECTION_TYPE>

export class ConnectionBindingUtil extends BindingUtil<ConnectionBinding> {
	static override type = CONNECTION_TYPE
	static override props = {
		portId: T.string,
		terminal: T.literalEnum('start', 'end'),
		order: T.number.optional(),
	}

	override getDefaultProps() {
		return {}
	}

	onBeforeIsolateToShape({ binding }: BindingOnShapeIsolateOptions<ConnectionBinding>): void {
		this.editor.deleteShapes([binding.fromId])
	}

	onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<ConnectionBinding>): void {
		this.editor.deleteShapes([binding.fromId])
	}

	onAfterCreate({ binding }: BindingOnCreateOptions<ConnectionBinding>): void {
		const node = this.editor.getShape(binding.toId)
		if (!node || !this.editor.isShapeOfType(node, 'node')) return
		onNodePortConnect(this.editor, node, binding.props.portId)
	}

	onAfterChange({ bindingBefore, bindingAfter }: BindingOnChangeOptions<ConnectionBinding>): void {
		if (
			bindingBefore.props.portId !== bindingAfter.props.portId ||
			bindingBefore.toId !== bindingAfter.toId
		) {
			const nodeBefore = this.editor.getShape(bindingBefore.toId)
			const nodeAfter = this.editor.getShape(bindingAfter.toId)
			if (
				!nodeBefore ||
				!nodeAfter ||
				!this.editor.isShapeOfType(nodeBefore, 'node') ||
				!this.editor.isShapeOfType(nodeAfter, 'node')
			) {
				return
			}
			onNodePortDisconnect(this.editor, nodeBefore, bindingBefore.props.portId)
			onNodePortConnect(this.editor, nodeAfter, bindingAfter.props.portId)
		}
	}

	onAfterDelete({ binding }: BindingOnDeleteOptions<ConnectionBinding>): void {
		const node = this.editor.getShape(binding.toId)
		if (!node || !this.editor.isShapeOfType(node, 'node')) return
		onNodePortDisconnect(this.editor, node, binding.props.portId)
	}
}

export interface ConnectionBindings {
	start?: ConnectionBinding
	end?: ConnectionBinding
}

export function getConnectionBindings(
	editor: Editor,
	shape: ConnectionShape | TLShapeId
): ConnectionBindings {
	return connectionBindingsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}

const connectionBindingsCache = createComputedCache(
	'connection bindings',
	(editor: Editor, connection: ConnectionShape) => {
		const bindings = editor.getBindingsFromShape(connection.id, CONNECTION_TYPE)
		let start, end
		for (const binding of bindings) {
			if (binding.props.terminal === 'start') {
				start = binding
			} else if (binding.props.terminal === 'end') {
				end = binding
			}
		}
		return { start, end }
	},
	{
		areRecordsEqual: (a, b) => a.id === b.id,
		areResultsEqual: (a, b) => a.start === b.start && a.end === b.end,
	}
)

export function getConnectionBindingPositionInPageSpace(
	editor: Editor,
	binding: ConnectionBinding
) {
	const targetShape = editor.getShape(binding.toId)
	if (!targetShape || !editor.isShapeOfType(targetShape, 'node')) return null

	const port = getNodePorts(editor, targetShape)?.[binding.props.portId]
	if (!port) return null

	return editor.getShapePageTransform(targetShape).applyToPoint(port)
}

export function createOrUpdateConnectionBinding(
	editor: Editor,
	connection: ConnectionShape | TLShapeId,
	target: NodeShape | TLShapeId,
	props: ConnectionBinding['props']
) {
	const connectionId = typeof connection === 'string' ? connection : connection.id
	const targetId = typeof target === 'string' ? target : target.id

	const existingMany = editor
		.getBindingsFromShape(connectionId, CONNECTION_TYPE)
		.filter((b) => b.props.terminal === props.terminal)

	if (existingMany.length > 1) {
		editor.deleteBindings(existingMany.slice(1))
	}

	// Auto-assign order for end-terminal (input port) bindings when not explicitly provided
	let order = props.order
	if (props.terminal === 'end' && order == null) {
		const existingBindingsToTarget = editor
			.getBindingsToShape(targetId, CONNECTION_TYPE)
			.filter((b) => b.props.terminal === 'end' && b.props.portId === props.portId)
		order = existingBindingsToTarget.reduce((max, b) => Math.max(max, b.props.order ?? 0), 0) + 1
	}
	const propsWithOrder = { ...props, order: order ?? props.order ?? 0 }

	const existing = existingMany[0]
	if (existing) {
		editor.updateBinding({
			...existing,
			toId: targetId,
			props: { ...propsWithOrder, order: existing.props.order ?? propsWithOrder.order },
		})
	} else {
		editor.createBinding({
			type: CONNECTION_TYPE,
			fromId: connectionId,
			toId: targetId,
			props: propsWithOrder,
		})
	}
}

export function removeConnectionBinding(
	editor: Editor,
	connection: ConnectionShape,
	terminal: 'start' | 'end'
) {
	const existing = editor
		.getBindingsFromShape(connection, CONNECTION_TYPE)
		.filter((b) => b.props.terminal === terminal)

	editor.deleteBindings(existing)
}
