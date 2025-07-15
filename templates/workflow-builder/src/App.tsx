import {
	createShapeId,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLComponents,
	Tldraw,
	ToolbarItem,
	useReadonly,
} from 'tldraw'
import { DraggingHandle } from 'tldraw/src/lib/tools/SelectTool/childStates/DraggingHandle'
import { InsertComponentPanel } from './components/InsertComponentPanel'
import { NodeToolbar } from './components/NodeToolbar.tsx'
import { OnCanvasComponentPicker } from './components/OnCanvasComponentPicker.tsx'
import {
	ConnectionBindingUtil,
	createOrUpdateConnectionBinding,
	getConnectionBindings,
} from './connection/ConnectionBindingUtil'
import { ConnectionShape, ConnectionShapeUtil } from './connection/ConnectionShapeUtil'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom'
import { getNodePorts } from './nodes/nodePorts.tsx'
import { NodeShapeUtil } from './nodes/NodeShapeUtil'
import { PointingPort } from './ports/PointingPort'
import { onCanvasComponentPickerState, updatePortState } from './state.tsx'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]

const components: TLComponents = {
	InFrontOfTheCanvas: () => (
		<>
			<NodeToolbar />
			<OnCanvasComponentPicker />
			<InsertComponentPanel />
		</>
	),
	Toolbar: () => {
		const isReadonly = useReadonly()
		return (
			<>
				<DefaultToolbar>
					{!isReadonly && (
						<>
							<ToolbarItem tool="insert-node" />
							<div
								style={{
									width: 1,
									height: 40,
									margin: '0px 2px',
									backgroundColor: 'var(--color-muted-2)',
								}}
							/>
						</>
					)}
					<DefaultToolbarContent />
				</DefaultToolbar>
			</>
		)
	},
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				persistenceKey="workflow-builder"
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				components={components}
				onMount={(editor) => {
					;(window as any).editor = editor
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

	const originalOnPointerUp = draggingHandle.onPointerUp
	draggingHandle.onPointerUp = function (...args) {
		try {
			const info = this.info!
			const connection = this.editor.getShape(this.shapeId)
			if (!connection || !editor.isShapeOfType<ConnectionShape>(connection, 'connection')) return

			const draggingTerminal = info.handle.id as 'start' | 'end'

			const bindings = getConnectionBindings(editor, connection)
			if (bindings[draggingTerminal]) {
				// we successfully connected the shape, so we're done!
				return
			}

			if (info.isCreating && draggingTerminal === 'end') {
				// if we were creating a new connection and didn't attach it to anything, open the
				// component picker at the end of this connection.
				editor.selectNone()
				onCanvasComponentPickerState.set(editor, {
					connectionShapeId: connection.id,
					location: draggingTerminal,
					onClose: () => {
						const bindings = getConnectionBindings(editor, connection)
						if (!bindings.start || !bindings.end) {
							editor.deleteShapes([connection.id])
						}
					},
					onPick: (nodeType, terminalInPageSpace) => {
						const newNodeId = createShapeId()
						editor.createShape({
							type: 'node',
							id: newNodeId,
							x: terminalInPageSpace.x,
							y: terminalInPageSpace.y,
							props: {
								node: nodeType,
							},
						})
						editor.select(newNodeId)

						const ports = getNodePorts(editor, newNodeId)
						const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
						if (firstInputPort) {
							editor.updateShape({
								id: newNodeId,
								type: 'node',
								x: terminalInPageSpace.x - firstInputPort.x,
								y: terminalInPageSpace.y - firstInputPort.y,
							})

							createOrUpdateConnectionBinding(editor, connection, newNodeId, {
								portId: firstInputPort.id,
								terminal: draggingTerminal,
							})
						}
					},
				})
			} else {
				// if we're not creating a new connection and we just let go, there must be
				// bindings. If not, let's interpret this as the user disconnecting the shape.
				if (!bindings.start || !bindings.end) {
					editor.deleteShapes([connection.id])
				}
			}
		} finally {
			originalOnPointerUp?.apply(this, args)

			updatePortState(editor, { hintingPort: null })
		}
	}
}

export default App
