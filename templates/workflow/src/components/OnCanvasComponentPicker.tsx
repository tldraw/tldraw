import { Dialog, VisuallyHidden } from 'radix-ui'
import { useCallback, useMemo, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TLShapeId,
	useEditor,
	usePassThroughWheelEvents,
	useQuickReactor,
	useValue,
	Vec,
	VecModel,
} from 'tldraw'
import { ConnectionShape, getConnectionTerminals } from '../connection/ConnectionShapeUtil'
import { NODE_WIDTH_PX } from '../constants'
import { getNodeDefinitions, NodeType } from '../nodes/nodeTypes'
import { NodeDefinition } from '../nodes/types/shared'
import { EditorAtom } from '../utils'

export interface OnCanvasComponentPickerState {
	connectionShapeId: TLShapeId
	location: 'start' | 'end' | 'middle'
	onPick: (nodeType: NodeType, position: VecModel) => void
	onClose: () => void
}

export const onCanvasComponentPickerState = new EditorAtom<OnCanvasComponentPickerState | null>(
	'on canvas component picker',
	() => null
)

// Component picker that appears when users drag connection handles without connecting to existing ports
export function OnCanvasComponentPicker() {
	const editor = useEditor()
	const onClose = useCallback(() => {
		const state = onCanvasComponentPickerState.get(editor)
		if (!state) return
		onCanvasComponentPickerState.set(editor, null)
		state.onClose()
	}, [editor])
	const nodeDefs = getNodeDefinitions(editor)

	return (
		<OnCanvasComponentPickerDialog onClose={onClose}>
			<TldrawUiMenuGroup id="math">
				<OnCanvasComponentPickerItem definition={nodeDefs.add} onClose={onClose} />
				<OnCanvasComponentPickerItem definition={nodeDefs.subtract} onClose={onClose} />
				<OnCanvasComponentPickerItem definition={nodeDefs.multiply} onClose={onClose} />
				<OnCanvasComponentPickerItem definition={nodeDefs.divide} onClose={onClose} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="logic">
				<OnCanvasComponentPickerItem definition={nodeDefs.conditional} onClose={onClose} />
			</TldrawUiMenuGroup>
		</OnCanvasComponentPickerDialog>
	)
}

// Dialog component that positions itself at the connection terminal
function OnCanvasComponentPickerDialog({
	children,
	onClose,
}: {
	children: React.ReactNode
	onClose: () => void
}) {
	const editor = useEditor()
	const location = useValue('location', () => onCanvasComponentPickerState.get(editor)?.location, [
		editor,
	])
	const shouldRender = !!location
	const [container, setContainer] = useState<HTMLDivElement | null>(null)
	// Allow wheel events to pass through to the canvas
	usePassThroughWheelEvents(useMemo(() => ({ current: container }), [container]))

	// Reactively update the dialog position when the connection or viewport changes
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

			// Get the connection terminals in connection space
			const terminals = getConnectionTerminals(editor, connection)
			const terminalInConnectionSpace =
				state.location === 'middle'
					? Vec.Lrp(terminals.start, terminals.end, 0.5)
					: terminals[state.location]

			// Transform the position from connection space to page space
			const terminalInPageSpace = editor
				.getShapePageTransform(connection)
				.applyToPoint(terminalInConnectionSpace)

			// Transform from page space to viewport space for positioning the dialog
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
						{children}
					</TldrawUiMenuContextProvider>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	)
}

// Individual menu item for selecting a node type
function OnCanvasComponentPickerItem<T extends NodeType>({
	definition,
	onClose,
}: {
	definition: NodeDefinition<T>
	onClose: () => void
}) {
	const editor = useEditor()

	return (
		<TldrawUiButton
			key={definition.type}
			type="menu"
			className="OnCanvasComponentPicker-button"
			onPointerDown={editor.markEventAsHandled}
			onClick={() => {
				const state = onCanvasComponentPickerState.get(editor)
				if (!state) return

				const connection = editor.getShape(state.connectionShapeId)
				if (!connection || !editor.isShapeOfType<ConnectionShape>(connection, 'connection')) {
					onClose()
					return
				}

				// Calculate the position where the new node should be created
				const terminals = getConnectionTerminals(editor, connection)
				const terminalInConnectionSpace =
					state.location === 'middle'
						? Vec.Lrp(terminals.start, terminals.end, 0.5)
						: terminals[state.location]

				// Transform from connection space to page space
				const terminalInPageSpace = editor
					.getShapePageTransform(connection)
					.applyToPoint(terminalInConnectionSpace)

				// Call the pick handler with the node type and position
				state.onPick(definition.getDefault(), terminalInPageSpace)

				onClose()
			}}
		>
			<TldrawUiButtonIcon icon={definition.icon} />
			<TldrawUiButtonLabel>{definition.title}</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}
