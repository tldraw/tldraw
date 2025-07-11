import {
	BindingOnShapeDeleteOptions,
	BindingOnShapeIsolateOptions,
	BindingUtil,
	createComputedCache,
	Editor,
	T,
	TLBaseBinding,
	TLShapeId,
} from 'tldraw'
import { getNodePorts } from '../nodes/nodePorts'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { PortId } from '../ports/Port'
import { ConnectionShape } from './ConnectionShapeUtil'

export interface ConnectionBindingProps {
	portId: PortId
	terminal: 'start' | 'end'
}

export type ConnectionBinding = TLBaseBinding<'connection', ConnectionBindingProps>

export class ConnectionBindingUtil extends BindingUtil<ConnectionBinding> {
	static override type = 'connection' as const
	static override props = {
		portId: T.string,
		terminal: T.literalEnum('start', 'end'),
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
}

const connectionBindingsCache = createComputedCache(
	'connection bindings',
	(editor: Editor, connection: ConnectionShape) => {
		const bindings = editor.getBindingsFromShape<ConnectionBinding>(connection.id, 'connection')
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
		// we only look at the arrow IDs:
		areRecordsEqual: (a, b) => a.id === b.id,
		// the records should stay the same:
		areResultsEqual: (a, b) => a.start === b.start && a.end === b.end,
	}
)

export function getConnectionBindings(
	editor: Editor,
	shape: ConnectionShape | TLShapeId
): { start?: ConnectionBinding; end?: ConnectionBinding } {
	return connectionBindingsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}

export function getConnectionBindingPositionInPageSpace(
	editor: Editor,
	binding: ConnectionBinding
) {
	const targetShape = editor.getShape(binding.toId)
	if (!targetShape || !editor.isShapeOfType<NodeShape>(targetShape, 'node')) return null
	const port = getNodePorts(editor, targetShape)?.[binding.props.portId]
	if (!port) return null
	return editor.getShapePageTransform(targetShape).applyToPoint(port)
}

export function createOrUpdateConnectionBinding(
	editor: Editor,
	connection: ConnectionShape | TLShapeId,
	target: NodeShape | TLShapeId,
	props: ConnectionBindingProps
) {
	const connectionId = typeof connection === 'string' ? connection : connection.id
	const targetId = typeof target === 'string' ? target : target.id

	const existingMany = editor
		.getBindingsFromShape<ConnectionBinding>(connectionId, 'connection')
		.filter((b) => b.props.terminal === props.terminal)

	// if we've somehow ended up with too many bindings, delete the extras
	if (existingMany.length > 1) {
		editor.deleteBindings(existingMany.slice(1))
	}

	const existing = existingMany[0]
	if (existing) {
		editor.updateBinding({
			...existing,
			toId: targetId,
			props,
		})
	} else {
		editor.createBinding({
			type: 'connection',
			fromId: connectionId,
			toId: targetId,
			props,
		})
	}
}

export function removeConnectionBinding(
	editor: Editor,
	connection: ConnectionShape,
	terminal: 'start' | 'end'
) {
	const existing = editor
		.getBindingsFromShape<ConnectionBinding>(connection, 'connection')
		.filter((b) => b.props.terminal === terminal)

	editor.deleteBindings(existing)
}
