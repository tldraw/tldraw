import {
	createShapeId,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLComponents,
	Tldraw,
	TLUiOverrides,
	ToolbarItem,
	useReadonly,
} from 'tldraw'
import { DraggingHandle } from 'tldraw/src/lib/tools/SelectTool/childStates/DraggingHandle'
import { InsertComponentDialog } from './components/InsertComponentDialog'
import { InsertComponentPanel } from './components/InsertComponentPanel'
import {
	ConnectionBindingUtil,
	createOrUpdateConnectionBinding,
	getConnectionBindings,
} from './connection/ConnectionBindingUtil'
import { ConnectionShape, ConnectionShapeUtil } from './connection/ConnectionShapeUtil'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom'
import { getNodePorts, NodeShapeUtil } from './nodes/NodeShapeUtil'
import { NodeType } from './nodes/nodeTypes.tsx'
import { PointingPort } from './ports/PointingPort'
import { updatePortState } from './ports/portState'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]

// Ok, yes totally cheating here.
let dialogHelpersRef: any = null

const uiOverrides: TLUiOverrides = {
	tools(_editor, tools, helpers) {
		const insertNodeTool = {
			id: 'insert-node',
			icon: 'plus',
			label: 'Node',
			onSelect() {
				helpers.addDialog({
					component: InsertComponentDialog,
				})
			},
		}
		dialogHelpersRef = helpers
		;(globalThis as any).dialogHelpersRef = helpers

		return {
			...tools,
			'insert-node': insertNodeTool,
		}
	},
	actions(_editor, actions, helpers) {
		const openInsertMenu = {
			id: 'open-insert-menu',
			kbd: 'c',
			icon: 'plus',
			onSelect() {
				helpers.addDialog({
					component: InsertComponentDialog,
				})
			},
		}
		dialogHelpersRef = helpers
		;(globalThis as any).dialogHelpersRef = helpers

		return {
			...actions,
			'open-insert-menu': openInsertMenu,
		}
	},
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		return <InsertComponentPanel />
	},
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
				overrides={uiOverrides}
				components={components}
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

			// Get handle position for node placement
			const transform = editor.getShapePageTransform(shape.id)
			const handle = editor.getShapeHandles(shape.id)!.find((h) => h.id === info.handle.id)
			if (!handle) return

			const handlePagePosition = transform.applyToPoint(handle)

			// Create dialog component with closure and show it
			if (dialogHelpersRef) {
				const DialogComponent = createNodeSelectionDialog(shape, handlePagePosition, editor)
				dialogHelpersRef.addDialog({
					component: DialogComponent,
					onClose: () => {
						updatePortState(editor, { hintingPort: null })

						if (editor.isShapeOfType<ConnectionShape>(shape, 'connection')) {
							const bindings = getConnectionBindings(editor, shape)
							if (!bindings.start || !bindings.end) {
								editor.deleteShapes([shape.id])
							}
						}
					},
				})
			}
		} finally {
			originalOnPointerUp?.apply(this, args)
		}
	}
}

// Helper function to create a node selection dialog with closure
function createNodeSelectionDialog(
	shape: ConnectionShape,
	handlePosition: { x: number; y: number },
	editor: Editor
) {
	return function NodeSelectionDialog({ onClose }: { onClose: () => void }) {
		const handleNodeSelected = (nodeType: NodeType) => {
			const newNodeId = createShapeId()
			editor.createShape({
				type: 'node',
				id: newNodeId,
				x: 0,
				y: 0,
				props: {
					node: nodeType,
				},
			})

			const ports = getNodePorts(editor, newNodeId)
			const firstInputPort = Object.values(ports).find((p: any) => p.terminal === 'end')
			if (firstInputPort) {
				editor.updateShape({
					id: newNodeId,
					type: 'node',
					x: handlePosition.x - (firstInputPort as any).x,
					y: handlePosition.y - (firstInputPort as any).y,
				})

				createOrUpdateConnectionBinding(editor, shape, newNodeId, {
					portId: (firstInputPort as any).id,
					terminal: 'end',
				})
			}

			onClose()
		}

		return <InsertComponentDialog onClose={onClose} onNodeSelected={handleNodeSelected} />
	}
}

export default App
