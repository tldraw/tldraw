import { createShapeId, Editor, Tldraw } from 'tldraw'
import { DraggingHandle } from 'tldraw/src/lib/tools/SelectTool/childStates/DraggingHandle'
import {
	ConnectionBindingUtil,
	createOrUpdateConnectionBinding,
	getConnectionBindings,
} from './connection/ConnectionBindingUtil'
import { ConnectionShape, ConnectionShapeUtil } from './connection/ConnectionShapeUtil'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom'
import { getNodePorts, NodeShapeUtil } from './nodes/NodeShapeUtil'
import { PointingPort } from './ports/PointingPort'
import { updatePortState } from './ports/portState'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				persistenceKey="workflow-builder"
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				onMount={(editor) => {
					if (!editor.getCurrentPageShapes().some((s) => s.type === 'node')) {
						editor.createShape({ type: 'node', x: 200, y: 200 })
					}

					editor.user.updateUserPreferences({ isSnapMode: true })
					editor.getStateDescendant('select')!.addChild(PointingPort)

					keepConnectionsAtBottom(editor)
					draggingHandleOverrides(editor)
				}}
			/>
		</div>
	)
}

function draggingHandleOverrides(editor: Editor) {
	const draggingHandle = editor.getStateDescendant('select.dragging_handle') as DraggingHandle
	const originalOnExit = draggingHandle.onExit
	draggingHandle.onExit = function (...args) {
		originalOnExit?.apply(this, args)

		updatePortState(this.editor, { hintingPort: null })

		const shape = this.editor.getShape(this.shapeId)
		if (shape && editor.isShapeOfType<ConnectionShape>(shape, 'connection')) {
			const bindings = getConnectionBindings(editor, shape)
			if (!bindings.start || !bindings.end) {
				editor.deleteShapes([shape.id])
			}
		}
	}

	const originalOnPointerUp = draggingHandle.onPointerUp
	draggingHandle.onPointerUp = function (...args) {
		try {
			const info = this.info!
			const shape = this.editor.getShape(this.shapeId)
			if (!shape || !editor.isShapeOfType<ConnectionShape>(shape, 'connection')) return

			// if we're creating a connection shape by dragging from an output port...
			if (!info.isCreating || info.handle.id !== 'end') return

			// ...and we haven't successfully connected to an existing node...
			const bindings = getConnectionBindings(editor, shape)
			if (bindings.end) return
			// ...then create a new node to connect to.
			const newNodeId = createShapeId()
			editor.createShape({
				type: 'node',
				id: newNodeId,
				x: 0,
				y: 0,
			})

			const ports = getNodePorts(editor, newNodeId)
			const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
			if (!firstInputPort) return

			const transform = editor.getShapePageTransform(shape.id)
			const handle = editor.getShapeHandles(shape.id)!.find((h) => h.id === info.handle.id)
			if (!handle) return

			const handlePagePosition = transform.applyToPoint(handle)

			editor.updateShape({
				id: newNodeId,
				type: 'node',
				x: handlePagePosition.x - firstInputPort.x,
				y: handlePagePosition.y - firstInputPort.y,
			})

			createOrUpdateConnectionBinding(editor, shape, newNodeId, {
				portId: firstInputPort.id,
				terminal: 'end',
			})
		} finally {
			originalOnPointerUp?.apply(this, args)
		}
	}
}

export default App
