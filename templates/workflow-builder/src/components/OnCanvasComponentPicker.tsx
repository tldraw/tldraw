import { Dialog, VisuallyHidden } from 'radix-ui'
import { useCallback, useMemo, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiMenuContextProvider,
	useEditor,
	usePassThroughWheelEvents,
	useQuickReactor,
	useValue,
	Vec,
} from 'tldraw'
import { ConnectionShape, getConnectionTerminals } from '../connection/ConnectionShapeUtil'
import { NODE_WIDTH_PX } from '../constants'
import { nodeTypes } from '../nodes/nodeTypeDefinitions'
import { onCanvasComponentPickerState } from '../state'

export function OnCanvasComponentPicker() {
	const editor = useEditor()
	const location = useValue('location', () => onCanvasComponentPickerState.get(editor)?.location, [
		editor,
	])
	const shouldRender = !!location
	const [container, setContainer] = useState<HTMLDivElement | null>(null)
	usePassThroughWheelEvents(useMemo(() => ({ current: container }), [container]))

	const onClose = useCallback(() => {
		const state = onCanvasComponentPickerState.get(editor)
		if (!state) return
		onCanvasComponentPickerState.set(editor, null)
		state.onClose()
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
			const terminalInConnectionSpace =
				state.location === 'middle'
					? Vec.Lrp(terminals.start, terminals.end, 0.5)
					: terminals[state.location]

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
				className={`OnCanvasComponentPicker OnCanvasComponentPicker_${location}`}
				style={{ width: NODE_WIDTH_PX }}
			>
				<div className="OnCanvasComponentPicker-content">
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
									const terminalInConnectionSpace =
										state.location === 'middle'
											? Vec.Lrp(terminals.start, terminals.end, 0.5)
											: terminals[state.location]

									const terminalInPageSpace = editor
										.getShapePageTransform(connection)
										.applyToPoint(terminalInConnectionSpace)

									state.onPick(nodeInfo.getDefault(), terminalInPageSpace)

									onClose()
								}}
							>
								<div className="OnCanvasComponentPicker-icon">{nodeInfo.icon}</div>
								<div>{nodeInfo.title}</div>
							</TldrawUiButton>
						))}
					</TldrawUiMenuContextProvider>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	)
}
