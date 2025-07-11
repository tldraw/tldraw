import { Dialog, VisuallyHidden } from 'radix-ui'
import { useCallback, useMemo, useState } from 'react'
import {
	createShapeId,
	TldrawUiButton,
	TldrawUiMenuContextProvider,
	useEditor,
	usePassThroughWheelEvents,
	useQuickReactor,
	useValue,
} from 'tldraw'
import {
	createOrUpdateConnectionBinding,
	getConnectionBindings,
} from '../connection/ConnectionBindingUtil'
import { ConnectionShape, getConnectionTerminals } from '../connection/ConnectionShapeUtil'
import { NODE_WIDTH_PX } from '../constants'
import { getNodePorts } from '../nodes/nodePorts'
import { nodeTypes } from '../nodes/nodeTypeDefinitions'
import { onCanvasComponentPickerState } from '../state'

export function OnCanvasComponentPicker() {
	const editor = useEditor()
	const shouldRender = useValue('shouldRender', () => !!onCanvasComponentPickerState.get(editor), [
		editor,
	])
	const [container, setContainer] = useState<HTMLDivElement | null>(null)
	usePassThroughWheelEvents(useMemo(() => ({ current: container }), [container]))

	const onClose = useCallback(() => {
		const state = onCanvasComponentPickerState.get(editor)
		if (!state) return
		onCanvasComponentPickerState.set(editor, null)

		const connection = editor.getShape(state.connectionShapeId)
		if (!connection || !editor.isShapeOfType<ConnectionShape>(connection, 'connection')) return

		const bindings = getConnectionBindings(editor, connection)
		if (!bindings.start || !bindings.end) {
			editor.deleteShapes([connection.id])
		}
	}, [editor])

	useQuickReactor(
		'OnCanvasComponentPicker',
		() => {
			const state = onCanvasComponentPickerState.get(editor)
			if (!state) return

			if (!container) return

			const connection = editor.getShape(state.connectionShapeId)
			if (!connection || !editor.isShapeOfType<ConnectionShape>(connection, 'connection')) {
				onClose()
				return
			}

			const terminals = getConnectionTerminals(editor, connection)
			const terminalInConnectionSpace = terminals[state.terminal]

			const terminalInPageSpace = editor
				.getShapePageTransform(connection)
				.applyToPoint(terminalInConnectionSpace)

			const terminalInViewportSpace = editor.pageToViewport(terminalInPageSpace)
			container.style.transform = `translate(${terminalInViewportSpace.x}px, ${terminalInViewportSpace.y}px) scale(${editor.getZoomLevel()}) `
		},
		[editor, container]
	)

	return (
		<Dialog.Root
			open={shouldRender}
			modal={false}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
		>
			<Dialog.Content
				ref={setContainer}
				className="OnCanvasComponentPicker"
				style={{ width: NODE_WIDTH_PX }}
			>
				<VisuallyHidden.Root>
					<Dialog.Title>Insert Node</Dialog.Title>
				</VisuallyHidden.Root>
				<TldrawUiMenuContextProvider sourceId="dialog" type="menu">
					{nodeTypes.map((nodeInfo) => (
						<TldrawUiButton
							key={nodeInfo.type}
							type="menu"
							className="OnCanvasComponentPicker-button"
							onClick={() => {
								const state = onCanvasComponentPickerState.get(editor)
								if (!state) return

								const connection = editor.getShape(state.connectionShapeId)
								if (
									!connection ||
									!editor.isShapeOfType<ConnectionShape>(connection, 'connection')
								) {
									onClose()
									return
								}

								const terminals = getConnectionTerminals(editor, connection)
								const terminalInConnectionSpace = terminals[state.terminal]

								const terminalInPageSpace = editor
									.getShapePageTransform(connection)
									.applyToPoint(terminalInConnectionSpace)

								const newNodeId = createShapeId()
								editor.createShape({
									type: 'node',
									id: newNodeId,
									x: terminalInPageSpace.x,
									y: terminalInPageSpace.y,
									props: {
										node: nodeInfo.getDefault(),
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
										terminal: state.terminal,
									})
								}

								onClose()
							}}
						>
							<div className="OnCanvasComponentPicker-icon">{nodeInfo.icon}</div>
							<div>{nodeInfo.title}</div>
						</TldrawUiButton>
					))}
				</TldrawUiMenuContextProvider>
			</Dialog.Content>
		</Dialog.Root>
	)
}
